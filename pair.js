// ╔══════════════════════════════════════════════════╗
// ║       MEGAMIND-MD — Session Pairing Server       ║
// ║  Deploy this separately to generate SESSION_ID   ║
// ╚══════════════════════════════════════════════════╝
// FIX: Each visitor gets their own fresh session.
// Sharing the link gives the next person a NEW pairing session — not yours.
// Sessions are cleaned up WITHOUT logging out the WhatsApp connection,
// so your SESSION_ID remains valid after you close the tab.

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const qrcode = require('qrcode');

const PORT = parseInt(process.env.PORT || '3000');
const SESSION_STORE = path.resolve(__dirname, 'temp/pair-sessions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Pages ──────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.send(getPairingHTML()));
app.get('/bot-image', (req, res) => {
  const img = path.join(__dirname, 'media/bot-image.png');
  if (fs.existsSync(img)) res.sendFile(img);
  else res.status(404).end();
});
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'MEGAMIND-MD Pairing Server', sessions: io.engine.clientsCount }));

// ── Socket.IO — one session per socket connection ──────────────────────────
// KEY FIX: Each socket.id creates a completely independent WhatsApp connection.
// When the user closes the tab the socket disconnects and we clean up the temp
// session files — but we do NOT call sockWA.logout() so the SESSION_ID they
// already copied stays valid forever.
io.on('connection', (socket) => {
  let sockWA = null;
  let sessionPath = null;
  let sessionDelivered = false;   // set to true once SESSION_ID is emitted

  async function startPairing(mode, phoneNumber) {
    // Each visitor gets a unique temp folder via socket.id
    sessionPath = path.join(SESSION_STORE, socket.id);
    await fs.ensureDir(sessionPath);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      sockWA = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        browser: ['MEGAMIND-MD', 'Chrome', '120.0.0'],
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        defaultQueryTimeoutMs: 60000,
      });

      sockWA.ev.on('creds.update', saveCreds);

      sockWA.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr && mode === 'qr') {
          try {
            const qrImage = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
            socket.emit('qr', qrImage);
          } catch {}
        }

        if (connection === 'open') {
          socket.emit('status', 'connected');
          try {
            const credsPath = path.join(sessionPath, 'creds.json');
            const creds = await fs.readJson(credsPath);
            const sessionId = 'MEGAMIND~' + Buffer.from(JSON.stringify(creds)).toString('base64');
            sessionDelivered = true;
            socket.emit('session', sessionId);
          } catch (err) {
            socket.emit('error', 'Failed to generate session: ' + err.message);
          }
        }

        if (connection === 'close') {
          const code = lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output?.statusCode : 0;
          if (code === DisconnectReason.loggedOut) {
            socket.emit('status', 'logged_out');
          } else if (!sessionDelivered) {
            socket.emit('status', 'reconnecting');
          }
        }
      });

      if (mode === 'pair' && phoneNumber) {
        await new Promise(r => setTimeout(r, 3000));
        if (!sockWA.authState.creds.registered) {
          const code = await sockWA.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
          const formatted = code.match(/.{1,4}/g)?.join('-') || code;
          socket.emit('pairing_code', formatted);
        }
      }
    } catch (err) {
      socket.emit('error', err.message);
    }
  }

  socket.on('start_qr', () => {
    socket.emit('status', 'generating_qr');
    startPairing('qr', null);
  });

  socket.on('start_pair', (phone) => {
    if (!phone || !/^\d{7,15}$/.test(phone.replace(/[^0-9]/g, ''))) {
      return socket.emit('error', 'Invalid phone number — use international format without + (e.g. 2348012345678)');
    }
    socket.emit('status', 'requesting_code');
    startPairing('pair', phone);
  });

  // ── Disconnect: clean up temp files WITHOUT logging out WhatsApp ───────
  // This preserves the validity of the SESSION_ID the user already received.
  socket.on('disconnect', async () => {
    if (sockWA) {
      sockWA.ev.removeAllListeners();
      // Do NOT call sockWA.logout() — that would invalidate the session!
      try { sockWA.ws?.close?.(); } catch {}
      sockWA = null;
    }
    if (sessionPath) {
      // Small delay so creds.json write finishes if mid-save
      await new Promise(r => setTimeout(r, 2000));
      await fs.remove(sessionPath).catch(() => {});
      sessionPath = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   🧠 MEGAMIND-MD Pairing Server      ║`);
  console.log(`║   Port: ${PORT}                          ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});

// ── HTML ───────────────────────────────────────────────────────────────────
function getPairingHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MEGAMIND-MD — Get Session ID</title>
  <script src="/socket.io/socket.io.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #020b18;
      --card: #081428;
      --card2: #0d1f35;
      --border: rgba(0,200,255,.18);
      --green: #00ff88;
      --cyan: #00d4ff;
      --purple: #a855f7;
      --gold: #fbbf24;
      --text: #cce8ff;
      --muted: #4a6a8a;
      --red: #ff4f4f;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Exo 2', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 30px 16px 60px;
      background-image:
        radial-gradient(ellipse at 15% 30%, rgba(0,212,255,.07) 0%, transparent 60%),
        radial-gradient(ellipse at 85% 70%, rgba(0,255,136,.05) 0%, transparent 60%),
        radial-gradient(ellipse at 50% 50%, rgba(168,85,247,.03) 0%, transparent 70%);
    }

    /* ── Header ─────────────────────────────────────────────────── */
    .header { text-align: center; margin-bottom: 32px; }
    .logo-wrap {
      position: relative; display: inline-block; margin-bottom: 18px;
    }
    .logo {
      width: 110px; height: 110px; border-radius: 50%; object-fit: cover;
      border: 3px solid var(--cyan);
      box-shadow: 0 0 30px rgba(0,212,255,.4), 0 0 60px rgba(0,212,255,.15), inset 0 0 20px rgba(0,212,255,.1);
      display: block;
    }
    .logo-ring {
      position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px;
      border-radius: 50%; border: 2px solid rgba(0,255,136,.3);
      animation: spin 8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    h1 {
      font-family: 'Orbitron', monospace;
      font-size: 2.4rem; font-weight: 900; letter-spacing: 5px;
      background: linear-gradient(135deg, var(--green) 0%, var(--cyan) 50%, var(--purple) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      margin-bottom: 8px;
    }
    .tagline { color: var(--muted); font-size: .9rem; letter-spacing: 1px; }
    .badge {
      display: inline-block; margin-top: 10px;
      background: linear-gradient(135deg, rgba(0,255,136,.1), rgba(0,212,255,.08));
      border: 1px solid rgba(0,255,136,.3); color: var(--green);
      padding: 4px 14px; border-radius: 20px; font-size: .72rem; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase;
    }

    /* ── Card ────────────────────────────────────────────────────── */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      width: 100%; max-width: 460px;
      box-shadow: 0 8px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(0,212,255,.05);
    }

    /* ── Tabs ────────────────────────────────────────────────────── */
    .tabs { display: flex; gap: 10px; margin-bottom: 28px; }
    .tab {
      flex: 1; padding: 11px; border-radius: 12px; font-size: .85rem;
      font-weight: 700; cursor: pointer; border: 1px solid var(--border);
      color: var(--muted); background: transparent;
      transition: all .25s; letter-spacing: .5px; font-family: 'Exo 2', sans-serif;
    }
    .tab.active {
      background: linear-gradient(135deg, rgba(0,255,136,.1), rgba(0,212,255,.08));
      color: var(--cyan); border-color: var(--cyan);
      box-shadow: 0 0 12px rgba(0,212,255,.15);
    }

    /* ── Sections ────────────────────────────────────────────────── */
    .section { display: none; }
    .section.active { display: block; }

    /* ── QR ──────────────────────────────────────────────────────── */
    .qr-container {
      background: #fff; border-radius: 16px; padding: 14px;
      display: inline-block; margin: 16px 0;
      box-shadow: 0 0 24px rgba(0,212,255,.2), 0 4px 12px rgba(0,0,0,.3);
    }
    .qr-container img { display: block; border-radius: 8px; max-width: 265px; }
    .qr-placeholder {
      width: 265px; height: 265px; display: flex; align-items: center;
      justify-content: center; color: #bbb; font-size: .85rem;
      border-radius: 8px; background: #f5f5f5; flex-direction: column; gap: 12px;
    }

    /* ── Input ───────────────────────────────────────────────────── */
    input[type=tel] {
      width: 100%; padding: 14px 16px; border-radius: 12px;
      border: 1px solid var(--border); background: rgba(255,255,255,.04);
      color: var(--text); font-size: 1rem; outline: none; margin-bottom: 14px;
      font-family: 'Exo 2', sans-serif; transition: border-color .2s, box-shadow .2s;
    }
    input[type=tel]:focus { border-color: var(--cyan); box-shadow: 0 0 12px rgba(0,212,255,.15); }
    input[type=tel]::placeholder { color: var(--muted); }

    /* ── Buttons ─────────────────────────────────────────────────── */
    .btn {
      display: block; width: 100%; padding: 14px; border: none; border-radius: 12px;
      font-size: .95rem; font-weight: 700; cursor: pointer; transition: all .2s;
      letter-spacing: .8px; font-family: 'Exo 2', sans-serif;
    }
    .btn-green {
      background: linear-gradient(90deg, var(--green), var(--cyan));
      color: #020b18; box-shadow: 0 4px 20px rgba(0,212,255,.25);
    }
    .btn-green:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,212,255,.35); }
    .btn-green:disabled { opacity: .6; cursor: not-allowed; transform: none; }
    .btn-outline {
      background: transparent; border: 1px solid var(--border); color: var(--muted); margin-top: 10px;
    }

    /* ── Status ──────────────────────────────────────────────────── */
    .status {
      display: flex; align-items: center; justify-content: center; gap: 9px;
      font-size: .84rem; margin-bottom: 18px; min-height: 24px;
    }
    .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .dot-green { background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 1.5s infinite; }
    .dot-cyan  { background: var(--cyan);  box-shadow: 0 0 8px var(--cyan);  animation: pulse 1.5s infinite; }
    .dot-red   { background: var(--red); }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* ── Pairing code ────────────────────────────────────────────── */
    .pair-code {
      font-size: 2.6rem; font-weight: 900; letter-spacing: 12px;
      color: var(--green); background: rgba(0,255,136,.05);
      border: 2px dashed rgba(0,255,136,.35); border-radius: 14px;
      padding: 22px 16px; margin: 16px 0; font-family: 'Orbitron', monospace;
      text-shadow: 0 0 20px rgba(0,255,136,.5);
    }

    /* ── Session box ─────────────────────────────────────────────── */
    .session-box {
      background: linear-gradient(135deg, rgba(0,255,136,.04), rgba(0,212,255,.03));
      border: 1px solid rgba(0,255,136,.25); border-radius: 14px;
      padding: 18px; margin-top: 20px; text-align: left;
    }
    .session-label {
      font-size: .7rem; color: var(--green); font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;
      display: flex; align-items: center; gap: 6px;
    }
    .session-id {
      font-family: monospace; font-size: .68rem; color: var(--cyan);
      word-break: break-all; line-height: 1.6; max-height: 80px; overflow-y: auto;
    }
    .copy-btn {
      width: 100%; margin-top: 14px; padding: 12px; border-radius: 10px;
      background: linear-gradient(90deg, var(--green), var(--cyan)); color: #020b18;
      font-weight: 700; font-size: .9rem; border: none; cursor: pointer;
      transition: all .2s; font-family: 'Exo 2', sans-serif;
    }
    .copy-btn:hover { filter: brightness(1.1); }
    .copy-btn.copied { background: linear-gradient(90deg, var(--cyan), var(--purple)); }

    /* ── Next steps ──────────────────────────────────────────────── */
    .next-steps {
      background: rgba(0,212,255,.04); border: 1px solid rgba(0,212,255,.18);
      border-radius: 14px; padding: 20px; margin-top: 20px; text-align: left;
    }
    .next-steps h3 {
      color: var(--cyan); font-size: .75rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px;
    }
    .step { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
    .step-num {
      flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
      background: rgba(0,212,255,.1); border: 1px solid rgba(0,212,255,.3);
      display: flex; align-items: center; justify-content: center;
      font-size: .72rem; color: var(--cyan); font-weight: 700;
    }
    .step span { color: var(--muted); font-size: .84rem; line-height: 1.55; }
    .step span strong { color: var(--text); }

    /* ── Success icon ────────────────────────────────────────────── */
    .success-icon { font-size: 3.5rem; margin: 8px 0 12px; }

    /* ── Error box ───────────────────────────────────────────────── */
    .error-box {
      background: rgba(255,79,79,.08); border: 1px solid rgba(255,79,79,.3);
      border-radius: 10px; padding: 12px 16px; margin-top: 14px;
      color: var(--red); font-size: .84rem; display: none;
    }

    /* ── Info notice ─────────────────────────────────────────────── */
    .info-notice {
      background: rgba(251,191,36,.05); border: 1px solid rgba(251,191,36,.2);
      border-radius: 12px; padding: 12px 16px; margin-bottom: 20px;
      font-size: .8rem; color: #fbbf24; display: flex; gap: 8px; align-items: flex-start;
    }

    /* ── How it works ────────────────────────────────────────────── */
    .how-it-works {
      margin-top: 28px; border-top: 1px solid rgba(255,255,255,.05); padding-top: 22px;
    }
    .how-it-works h3 {
      font-size: .72rem; color: var(--muted); text-transform: uppercase;
      letter-spacing: 2px; margin-bottom: 14px; font-weight: 700;
    }

    /* ── Footer ──────────────────────────────────────────────────── */
    footer {
      margin-top: 40px; color: var(--muted); font-size: .76rem; text-align: center;
      border-top: 1px solid rgba(255,255,255,.05); padding-top: 20px; width: 100%; max-width: 460px;
    }
    footer a { color: var(--cyan); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
    .powered { margin-top: 8px; font-size: .68rem; opacity: .5; }

    @media (max-width: 480px) {
      h1 { font-size: 1.8rem; letter-spacing: 3px; }
      .card { padding: 22px 16px; }
      .pair-code { font-size: 2rem; letter-spacing: 8px; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">
      <div class="logo-ring"></div>
      <img class="logo" src="/bot-image" alt="MEGAMIND-MD" onerror="this.style.display='none'"/>
    </div>
    <h1>MEGAMIND-MD</h1>
    <p class="tagline">🧠 The Most Powerful WhatsApp Bot</p>
    <span class="badge">Pairing Site</span>
  </div>

  <!-- Card -->
  <div class="card">
    <!-- Info notice -->
    <div class="info-notice">
      <span>🔒</span>
      <span>Each visitor gets their own <strong>unique session</strong>. Sharing this link is safe — others get their own code, not yours.</span>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" onclick="switchTab('qr')">📷 QR Code</button>
      <button class="tab" onclick="switchTab('pair')">📱 Pairing Code</button>
    </div>

    <!-- Status -->
    <div class="status" id="status-area"></div>

    <!-- QR Section -->
    <div class="section active" id="section-qr">
      <div style="text-align:center">
        <div class="qr-container">
          <div class="qr-placeholder" id="qr-placeholder">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.3"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h.01M17 14h3M14 17v3M17 17h.01M20 17v3M20 20h.01"/></svg>
            <span>Click below to generate</span>
          </div>
          <img id="qr-img" style="display:none;width:265px;height:265px;" alt="QR Code"/>
        </div>
      </div>
      <button class="btn btn-green" id="qr-btn" onclick="startQR()">🔗 Generate QR Code</button>
      <div id="error-qr" class="error-box"></div>
    </div>

    <!-- Pairing Code Section -->
    <div class="section" id="section-pair">
      <input type="tel" id="phone-input" placeholder="Phone number e.g. 2348012345678" maxlength="20"/>
      <button class="btn btn-green" id="pair-btn" onclick="startPair()">📲 Get Pairing Code</button>
      <div id="pair-display" style="display:none;text-align:center">
        <div class="pair-code" id="pair-code-text">----</div>
        <p style="color:var(--muted);font-size:.82rem">Open WhatsApp → Linked Devices → Link with phone number → Enter this code</p>
      </div>
      <div id="error-pair" class="error-box"></div>
    </div>

    <!-- Session display (after connection) -->
    <div id="session-section" style="display:none;text-align:center">
      <div class="success-icon">✅</div>
      <p style="color:var(--green);font-weight:700;font-size:1.05rem;margin-bottom:6px">Connected Successfully!</p>
      <p style="color:var(--muted);font-size:.82rem;margin-bottom:4px">Your unique SESSION ID is ready:</p>
      <div class="session-box">
        <div class="session-label">🔑 SESSION ID — paste into your .env</div>
        <div class="session-id" id="session-id-text"></div>
      </div>
      <button class="copy-btn" id="copy-btn" onclick="copySession()">📋 Copy SESSION ID</button>

      <div class="next-steps">
        <h3>⚡ What to do next</h3>
        <div class="step"><span class="step-num">1</span><span>Copy the <strong>SESSION ID</strong> above</span></div>
        <div class="step"><span class="step-num">2</span><span>Download the bot ZIP from <a href="https://github.com/MEGAMIND-MD/MEGAMIND-MD" style="color:var(--cyan)">GitHub</a></span></div>
        <div class="step"><span class="step-num">3</span><span>In your <strong>.env</strong> file: <code style="color:var(--green)">SESSION_ID=&lt;paste here&gt;</code></span></div>
        <div class="step"><span class="step-num">4</span><span>Upload to <strong>bothosting.net</strong>, <strong>Katabam</strong>, or any host</span></div>
        <div class="step"><span class="step-num">5</span><span>Start command: <code style="color:var(--green)">node index.js</code> — bot connects instantly! 🎉</span></div>
      </div>
    </div>

    <!-- How it works (shown before session) -->
    <div class="how-it-works" id="how-it-works">
      <h3>How it works</h3>
      <div class="step"><span class="step-num">1</span><span>Choose <strong>QR Code</strong> or <strong>Pairing Code</strong></span></div>
      <div class="step"><span class="step-num">2</span><span>Connect your WhatsApp account</span></div>
      <div class="step"><span class="step-num">3</span><span>Copy your personal <strong>SESSION ID</strong></span></div>
      <div class="step"><span class="step-num">4</span><span>Add it to your <strong>.env</strong> and deploy</span></div>
      <div class="step"><span class="step-num">5</span><span>Bot connects <strong>instantly</strong> — no more scanning!</span></div>
    </div>
  </div>

  <footer>
    🧠 MEGAMIND-MD &nbsp;|&nbsp; <a href="/health">API Status</a><br/>
    <div class="powered">Your session is private • Each visitor gets their own unique session • Powered by Baileys</div>
  </footer>

  <script>
    const socket = io({ transports: ['websocket', 'polling'] });
    let currentTab = 'qr';
    let sessionGenerated = false;

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ['qr','pair'][i] === tab));
      document.getElementById('section-qr').classList.toggle('active', tab === 'qr');
      document.getElementById('section-pair').classList.toggle('active', tab === 'pair');
      document.getElementById('error-qr').style.display = 'none';
      document.getElementById('error-pair').style.display = 'none';
    }

    function setStatus(msg, type) {
      const area = document.getElementById('status-area');
      const dotMap = { green: 'dot-green', cyan: 'dot-cyan', red: 'dot-red' };
      const cls = dotMap[type] || '';
      area.innerHTML = msg ? \`<span class="dot \${cls}"></span><span>\${msg}</span>\` : '';
    }

    function showError(id, msg) {
      const el = document.getElementById(id);
      el.textContent = '❌ ' + msg;
      el.style.display = 'block';
    }

    function startQR() {
      document.getElementById('error-qr').style.display = 'none';
      document.getElementById('qr-btn').disabled = true;
      document.getElementById('qr-btn').textContent = '⏳ Connecting...';
      setStatus('Connecting to WhatsApp...', 'cyan');
      socket.emit('start_qr');
    }

    function startPair() {
      const phone = document.getElementById('phone-input').value.replace(/[^0-9]/g, '');
      if (!phone || phone.length < 7) return showError('error-pair', 'Enter a valid phone number (international format, no +)');
      document.getElementById('error-pair').style.display = 'none';
      document.getElementById('pair-btn').disabled = true;
      document.getElementById('pair-btn').textContent = '⏳ Requesting code...';
      setStatus('Requesting pairing code...', 'cyan');
      socket.emit('start_pair', phone);
    }

    function copySession() {
      const text = document.getElementById('session-id-text').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = '✅ Copied to clipboard!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '📋 Copy SESSION ID'; btn.classList.remove('copied'); }, 2500);
      }).catch(() => {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        document.getElementById('copy-btn').textContent = '✅ Copied!';
      });
    }

    function showSession(id) {
      sessionGenerated = true;
      document.getElementById('session-id-text').textContent = id;
      document.getElementById('session-section').style.display = 'block';
      document.getElementById('how-it-works').style.display = 'none';
      document.getElementById('qr-placeholder').style.display = 'none';
      document.getElementById('qr-img').style.display = 'none';
      document.getElementById('pair-display').style.display = 'none';
      setStatus('✅ Connected — Session ID ready!', 'green');
    }

    // ── Socket events ───────────────────────────────────────────────
    socket.on('qr', (dataUrl) => {
      setStatus('Scan QR with WhatsApp → Linked Devices', 'cyan');
      document.getElementById('qr-placeholder').style.display = 'none';
      const img = document.getElementById('qr-img');
      img.src = dataUrl;
      img.style.display = 'block';
      document.getElementById('qr-btn').textContent = '🔄 QR auto-refreshing...';
    });

    socket.on('pairing_code', (code) => {
      setStatus('Enter code in WhatsApp within 60 seconds', 'cyan');
      document.getElementById('pair-display').style.display = 'block';
      document.getElementById('pair-code-text').textContent = code;
      document.getElementById('pair-btn').textContent = '✅ Code sent to your WhatsApp!';
    });

    socket.on('status', (s) => {
      const map = {
        connected: ['Generating your Session ID...', 'green'],
        reconnecting: ['Reconnecting...', 'cyan'],
        generating_qr: ['Generating QR Code...', 'cyan'],
        requesting_code: ['Requesting pairing code...', 'cyan'],
        logged_out: ['Logged out — refresh and try again', 'red'],
      };
      if (map[s]) setStatus(map[s][0], map[s][1]);
    });

    socket.on('session', showSession);

    socket.on('error', (msg) => {
      setStatus('Error occurred', 'red');
      const errId = currentTab === 'qr' ? 'error-qr' : 'error-pair';
      showError(errId, msg);
      document.getElementById('qr-btn').disabled = false;
      document.getElementById('pair-btn').disabled = false;
      document.getElementById('qr-btn').textContent = '🔗 Generate QR Code';
      document.getElementById('pair-btn').textContent = '📲 Get Pairing Code';
    });

    socket.on('disconnect', () => {
      if (!sessionGenerated) setStatus('Disconnected from server — refresh to try again', 'red');
    });
  </script>
</body>
</html>`;
}
