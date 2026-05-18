const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const logger = require('./logger');
const { restoreSession, SESSION_DIR } = require('./sessionManager');
const settings = require('../settings');

let sock = null;
let messageHandler = null;
let reconnectCount = 0;
const MAX_RECONNECTS = 10;

function getSocket() { return sock; }

async function connectToWhatsApp(handler) {
  messageHandler = handler;

  // Restore session from SESSION_ID env if present
  if (settings.sessionId) {
    await restoreSession(settings.sessionId);
  }

  return _connect();
}

async function connectWithPairingCode(phoneNumber, handler) {
  messageHandler = handler;
  return _connect(phoneNumber);
}

async function _connect(pairingPhone = null) {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['MEGAMIND-MD', 'Chrome', '120.0.0'],
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    retryRequestDelayMs: 250,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // Request pairing code if in pairing mode
  if (pairingPhone && !sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(pairingPhone.replace(/[^0-9]/g, ''));
      logger.info(`\n╔═══════════════════════════╗\n║  PAIRING CODE: ${code.match(/.{1,4}/g)?.join('-') || code}  ║\n╚═══════════════════════════╝`);
    } catch (err) {
      logger.error({ err }, 'Failed to get pairing code');
    }
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('QR code updated — visit the web UI to scan');
      // Emit to qrServer if available
      try { require('./qrServer').emitQR(qr); } catch {}
    }

    if (connection === 'open') {
      reconnectCount = 0;
      logger.info('✅ Connected to WhatsApp!');
      try { require('./qrServer').emitConnected(); } catch {}
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : 0;

      const shouldReconnect = code !== DisconnectReason.loggedOut && reconnectCount < MAX_RECONNECTS;

      logger.warn({ code, reconnectCount }, 'Connection closed');

      if (code === DisconnectReason.loggedOut) {
        logger.error('Logged out — please re-scan or re-pair');
        try { require('./qrServer').emitLoggedOut(); } catch {}
        return;
      }

      if (shouldReconnect) {
        reconnectCount++;
        const delay = Math.min(5000 * reconnectCount, 30000);
        logger.info(`Reconnecting in ${delay / 1000}s... (attempt ${reconnectCount}/${MAX_RECONNECTS})`);
        setTimeout(() => _connect(pairingPhone), delay);
      } else {
        logger.error('Max reconnects reached. Exiting.');
        process.exit(1);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !messageHandler) return;
    for (const msg of messages) {
      try {
        await messageHandler(sock, msg);
      } catch (err) {
        logger.error({ err }, 'Error in message handler');
      }
    }
  });

  return sock;
}

module.exports = { connectToWhatsApp, connectWithPairingCode, getSocket };
