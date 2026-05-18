const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs-extra');
const settings = require('../settings');

let _io = null;

function emitQR(qr) {
  if (!_io) return;
  qrcode.toDataURL(qr, { width: 300, margin: 2 }).then(dataUrl => {
    _io.emit('qr', dataUrl);
  }).catch(() => {});
}

function emitConnected() { if (_io) _io.emit('status', 'connected'); }
function emitLoggedOut() { if (_io) _io.emit('status', 'logged_out'); }

function setupQRRoutes(app) {
  app.get('/', (req, res) => res.send(getDashboardHTML()));
  app.get('/bot-image', (req, res) => {
    const img = path.resolve(__dirname, '../media/bot-image.png');
    if (fs.existsSync(img)) res.sendFile(img);
    else res.status(404).end();
  });
  app.get('/health', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'online', bot: settings.botName, version: settings.botVersion,
      uptime: process.uptime(),
      memory: { heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB', heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB' },
      timestamp: new Date().toISOString(),
    });
  });
}

function setupSocketIO(io) {
  _io = io;
}

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>MEGAMIND-MD — Dashboard</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#030d1c;--card:#071426;--border:rgba(0,200,255,.15);--green:#00ff88;--cyan:#00d4ff;--purple:#a855f7;--text:#cce8ff;--muted:#4a6a8a;--red:#ff4f4f;--gold:#fbbf24}
    body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;
      background-image:radial-gradient(ellipse at 20% 50%,rgba(0,100,255,.05) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(0,255,136,.04) 0%,transparent 60%)}
    .header{text-align:center;padding:40px 20px 20px;position:relative}
    .logo{width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--cyan);
      box-shadow:0 0 30px rgba(0,212,255,.3),0 0 60px rgba(0,212,255,.1);margin-bottom:16px;display:block;margin-left:auto;margin-right:auto}
    h1{font-size:2.2rem;font-weight:900;letter-spacing:4px;
      background:linear-gradient(135deg,var(--green),var(--cyan),var(--purple));
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .tagline{color:var(--muted);font-size:.9rem;margin-top:6px}
    .version-badge{display:inline-block;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.4);
      color:var(--purple);padding:4px 12px;border-radius:20px;font-size:.75rem;margin-top:10px;font-weight:700;letter-spacing:1px}
    
    .container{max-width:900px;margin:0 auto;padding:20px 16px 60px}
    
    .status-bar{display:flex;align-items:center;justify-content:center;gap:10px;
      background:rgba(0,255,136,.04);border:1px solid rgba(0,255,136,.15);
      border-radius:50px;padding:10px 24px;margin:0 auto 30px;max-width:400px}
    .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .dot-green{background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 1.5s infinite}
    .dot-cyan{background:var(--cyan);animation:pulse 1.5s infinite}
    .dot-red{background:var(--red)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-bottom:24px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;
      box-shadow:0 4px 24px rgba(0,0,0,.3);transition:transform .2s,box-shadow .2s}
    .card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4)}
    .card-title{font-size:.7rem;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:12px;font-weight:700}
    .card-value{font-size:2rem;font-weight:900;color:var(--cyan)}
    .card-sub{font-size:.8rem;color:var(--muted);margin-top:4px}
    
    .qr-section{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px}
    .qr-title{font-size:1rem;font-weight:700;color:var(--cyan);margin-bottom:20px}
    .qr-wrap{background:#fff;border-radius:12px;padding:12px;display:inline-block;margin:10px 0;box-shadow:0 0 20px rgba(0,212,255,.15)}
    .qr-wrap img{display:block;max-width:240px;border-radius:8px}
    .qr-placeholder{width:240px;height:240px;display:flex;align-items:center;justify-content:center;
      color:#aaa;font-size:.85rem;background:#f9f9f9;border-radius:8px;flex-direction:column;gap:12px}
    
    .connected-banner{background:linear-gradient(135deg,rgba(0,255,136,.08),rgba(0,212,255,.05));
      border:1px solid rgba(0,255,136,.3);border-radius:16px;padding:30px;text-align:center;display:none}
    .connected-banner.show{display:block}
    .connected-icon{font-size:3.5rem;margin-bottom:12px}
    .connected-text{font-size:1.2rem;font-weight:700;color:var(--green)}
    .connected-sub{color:var(--muted);font-size:.85rem;margin-top:8px}
    
    .feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px}
    .feat-item{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;
      display:flex;align-items:center;gap:12px}
    .feat-icon{font-size:1.5rem;flex-shrink:0}
    .feat-name{font-size:.85rem;font-weight:600;color:var(--text)}
    .feat-desc{font-size:.75rem;color:var(--muted);margin-top:2px}
    
    .btn{display:inline-block;padding:12px 24px;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:.9rem;transition:all .2s}
    .btn-primary{background:linear-gradient(90deg,var(--green),var(--cyan));color:#030d1c}
    .btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
    
    footer{text-align:center;color:var(--muted);font-size:.78rem;padding:20px;border-top:1px solid var(--border)}
    footer a{color:var(--cyan);text-decoration:none}
    
    .section-label{font-size:.7rem;text-transform:uppercase;letter-spacing:2px;color:var(--muted);font-weight:700;margin:24px 0 12px}
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="/bot-image" onerror="this.style.display='none'" alt="MEGAMIND-MD"/>
    <h1>MEGAMIND-MD</h1>
    <p class="tagline">🧠 The Most Powerful WhatsApp Bot</p>
    <span class="version-badge">v${settings.botVersion} ONLINE</span>
  </div>

  <div class="container">
    <div class="status-bar" id="status-bar">
      <span class="dot dot-cyan" id="status-dot"></span>
      <span id="status-text">Checking connection...</span>
    </div>

    <!-- Stats -->
    <div class="grid">
      <div class="card">
        <div class="card-title">Bot Name</div>
        <div class="card-value" style="font-size:1.4rem">${settings.botName}</div>
        <div class="card-sub">Prefix: <code style="color:var(--green)">${settings.prefix}</code></div>
      </div>
      <div class="card">
        <div class="card-title">Uptime</div>
        <div class="card-value" id="uptime-val">--</div>
        <div class="card-sub">Since last restart</div>
      </div>
      <div class="card">
        <div class="card-title">Memory</div>
        <div class="card-value" id="mem-val">--</div>
        <div class="card-sub">Heap used</div>
      </div>
    </div>

    <!-- QR / Connected -->
    <div class="qr-section" id="qr-section">
      <div class="qr-title">📷 Scan to Connect</div>
      <div class="qr-wrap">
        <div class="qr-placeholder" id="qr-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M17 14h3M14 17v3M17 17h.01M20 17v3M20 20h.01"/></svg>
          <span>Waiting for QR...</span>
        </div>
        <img id="qr-img" style="display:none;width:240px;height:240px;" alt="QR Code"/>
      </div>
      <p style="color:var(--muted);font-size:.82rem;margin-top:12px">Open WhatsApp → Linked Devices → Link a Device → Scan</p>
    </div>

    <div class="connected-banner" id="connected-banner">
      <div class="connected-icon">🧠</div>
      <div class="connected-text">MEGAMIND-MD is Online!</div>
      <div class="connected-sub">Bot is connected and ready to respond to commands</div>
    </div>

    <!-- Features -->
    <div class="section-label">Features</div>
    <div class="feat-grid">
      <div class="feat-item"><span class="feat-icon">👑</span><div><div class="feat-name">Owner Commands</div><div class="feat-desc">Full bot control</div></div></div>
      <div class="feat-item"><span class="feat-icon">👥</span><div><div class="feat-name">Group Management</div><div class="feat-desc">Admin tools & protection</div></div></div>
      <div class="feat-item"><span class="feat-icon">⬇️</span><div><div class="feat-name">Downloaders</div><div class="feat-desc">YouTube, TikTok, Instagram</div></div></div>
      <div class="feat-item"><span class="feat-icon">🧠</span><div><div class="feat-name">AI Commands</div><div class="feat-desc">GPT, Gemini, image generation</div></div></div>
      <div class="feat-item"><span class="feat-icon">🎭</span><div><div class="feat-name">Reactions</div><div class="feat-desc">Animated GIF stickers</div></div></div>
      <div class="feat-item"><span class="feat-icon">🛡️</span><div><div class="feat-name">Anti-Spam / Anti-Link</div><div class="feat-desc">Group protection</div></div></div>
      <div class="feat-item"><span class="feat-icon">🎮</span><div><div class="feat-name">Fun & Games</div><div class="feat-desc">Jokes, truths, dares</div></div></div>
      <div class="feat-item"><span class="feat-icon">🔧</span><div><div class="feat-name">Utilities</div><div class="feat-desc">Sticker, TTS, QR, weather</div></div></div>
    </div>
  </div>

  <footer>🧠 MEGAMIND-MD | <a href="/health">Health API</a> | Powered by Baileys</footer>

  <script>
    // Poll health endpoint
    async function pollHealth() {
      try {
        const r = await fetch('/health');
        const d = await r.json();
        document.getElementById('uptime-val').textContent = formatUptime(d.uptime);
        document.getElementById('mem-val').textContent = d.memory.heapUsed;
      } catch {}
    }

    function formatUptime(s) {
      const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
      return d>0 ? d+'d '+h+'h '+m+'m' : h>0 ? h+'h '+m+'m '+sec+'s' : m+'m '+sec+'s';
    }

    pollHealth(); setInterval(pollHealth, 10000);

    // QR via server-sent events (simple polling)
    let qrShown = false;
    async function checkQR() {
      // QR is displayed via the bot emitting to this page if socket.io is available
    }

    // If bot is already connected (no QR needed), show connected banner
    async function checkStatus() {
      try {
        const r = await fetch('/health');
        if (r.ok) {
          const d = await r.json();
          if (d.status === 'online') {
            // Check if session exists
            const dot = document.getElementById('status-dot');
            const txt = document.getElementById('status-text');
            dot.className = 'dot dot-green';
            txt.textContent = 'Bot is online and connected';
          }
        }
      } catch {}
    }
    checkStatus();
  </script>
</body>
</html>`;
}

module.exports = { setupQRRoutes, setupSocketIO, emitQR, emitConnected, emitLoggedOut };
