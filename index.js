// ╔══════════════════════════════════════════════════╗
// ║          MEGAMIND-MD WhatsApp Bot                ║
// ║          The Most Powerful WhatsApp Bot          ║
// ║          Powered by @whiskeysockets/baileys      ║
// ╚══════════════════════════════════════════════════╝

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const logger = require('./lib/logger');
const { connectToWhatsApp, connectWithPairingCode, getSocket } = require('./lib/connection');
const { handleMessage, listCommands } = require('./lib/handler');
const { loadPlugins } = require('./lib/pluginLoader');
const { setupQRRoutes, setupSocketIO } = require('./lib/qrServer');
const { getGroup, getSetting, setSetting, getDB } = require('./lib/database');
const { cleanTemp, getBody } = require('./lib/utils');
const settings = require('./settings');

// ── Anti-crash ────────────────────────────────────────────────────────────────
if (settings.antiCrash) {
  process.on('uncaughtException', err => logger.error({ err }, 'Uncaught Exception'));
  process.on('unhandledRejection', reason => logger.error({ reason }, 'Unhandled Rejection'));
}

// ── Required directories ──────────────────────────────────────────────────────
['session', 'database', 'media', 'temp', 'plugins', 'public'].forEach(d => {
  fs.ensureDirSync(path.resolve(__dirname, d));
});

// ── Message store for anti-delete (max 500 entries) ───────────────────────────
const messageStore = {};

// ── Express + Socket.IO ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
setupQRRoutes(app);
setupSocketIO(io);

app.get('/health', (_req, res) => {
  const mem = process.memoryUsage();
  const db = getDB();
  res.json({
    status: 'online', bot: settings.botName, version: settings.botVersion,
    uptime: process.uptime(), commands: listCommands().length,
    stats: db.botStats || {},
    memory: { heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB', heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB' },
    timestamp: new Date().toISOString(),
  });
});

// ── Uptime self-ping ──────────────────────────────────────────────────────────
if (settings.uptimeUrl) {
  cron.schedule('*/5 * * * *', async () => {
    try { await axios.get(settings.uptimeUrl, { timeout: 10000 }); }
    catch { logger.warn('Uptime ping failed'); }
  });
}

// ── Temp cleanup ──────────────────────────────────────────────────────────────
cron.schedule('*/10 * * * *', () => cleanTemp().catch(() => {}));

// ── Scheduled messages ────────────────────────────────────────────────────────
let schedulerStarted = false;
function startScheduler(sock) {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(async () => {
    const db = getDB();
    if (!db.scheduledMessages?.length) return;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const toRemove = [];
    for (const sched of db.scheduledMessages) {
      if (sched.time === currentTime) {
        try {
          await sock.sendMessage(sched.chatJid, { text: `⏰ *Scheduled Message:*\n\n${sched.message}` });
          if (!sched.repeat) toRemove.push(sched.id);
        } catch {}
      }
    }
    if (toRemove.length) {
      const { setScheduledMessages } = require('./lib/database');
      setScheduledMessages(db.scheduledMessages.filter(s => !toRemove.includes(s.id)));
    }
  }, 60000);
}

// ── Group events (welcome/goodbye + auto-moderation) ─────────────────────────
function setupGroupEvents(sock) {
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    const group = getGroup(id);
    if (!group?.welcome) return;
    try {
      const meta = await sock.groupMetadata(id).catch(() => null);
      if (!meta) return;
      const welcomeImg = path.resolve(__dirname, 'media/welcome_image.jpg');
      for (const jid of participants) {
        const num = jid.split('@')[0];
        let text;
        if (action === 'add') {
          text = `╭━━━〔 *WELCOME* 〕━━━┈\n┃ 👋 Hello @${num}!\n┃\n┃ 🏠 *Group:* ${meta.subject}\n┃ 👥 *Members:* ${meta.participants.length}\n┃\n┃ Welcome to the group! 🎉\n┃ Please read the group rules.\n╰━━━━━━━━━━━━━━━━━━┈`;
        } else if (action === 'remove') {
          text = `╭━━━〔 *GOODBYE* 〕━━━┈\n┃ 👋 @${num} has left.\n┃ 👥 *Members:* ${meta.participants.length}\n╰━━━━━━━━━━━━━━━━━━┈\n_We hope to see you again!_`;
        }
        if (text) {
          if (action === 'add' && fs.existsSync(welcomeImg)) {
            await sock.sendMessage(id, { image: fs.readFileSync(welcomeImg), caption: text, mentions: [jid] }).catch(() => {});
          } else {
            await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
          }
        }
      }
    } catch {}
  });
}

// ── Call rejection ────────────────────────────────────────────────────────────
function setupCallEvents(sock) {
  sock.ev.on('call', async calls => {
    for (const call of calls) {
      const antiCall = getSetting('antiCall') ?? settings.antiCall;
      if (antiCall && call.status === 'offer') {
        await sock.rejectCall(call.id, call.from).catch(() => {});
        await sock.sendMessage(call.from, { text: '📵 Calls are not accepted. Please send a message.' }).catch(() => {});
      }
    }
  });
}

// ── Message event — handles ALL special auto features ─────────────────────────
function setupMessageEvents(sock) {
  const ownerJid = settings.ownerNumber;

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      const from = msg.key.remoteJid;
      if (!from) continue;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? (msg.key.participant || from) : from;
      const db = getDB();

      // ── 1. AUTO-VIEW STATUS ──────────────────────────────────────────────
      if (from === 'status@broadcast') {
        if (!msg.key.fromMe) {
          const statusSender = msg.key.participant || from;
          const delay = 2000 + Math.floor(Math.random() * 4000);
          setTimeout(async () => {
            try {
              await sock.readMessages([msg.key]);
              logger.info(`👀 Status viewed: ${statusSender?.split('@')[0]}`);
              if (getSetting('autoStatusReply')) {
                await sock.sendMessage(statusSender, {
                  text: `╭━━━〔 *STATUS SEEN* 〕━━━┈\n┃ 👀 *MEGAMIND-MD* just viewed\n┃ your status!\n┃\n┃ _Keep posting great content!_ 🔥\n╰━━━━━━━━━━━━━━━━━━┈`,
                }).catch(() => {});
              }
            } catch {}
          }, delay);
        }
        continue; // Do not process status as a command
      }

      // ── 2. CACHE MESSAGE for anti-delete (max 500) ───────────────────────
      if (msg.key.id) {
        messageStore[msg.key.id] = { msg, from, sender, isGroup };
        const keys = Object.keys(messageStore);
        if (keys.length > 500) delete messageStore[keys[0]];
      }

      // ── 3. TRACK MESSAGE STATS ───────────────────────────────────────────
      if (!msg.key.fromMe) {
        if (!db.botStats) db.botStats = { totalMessages: 0, totalCommands: 0 };
        db.botStats.totalMessages = (db.botStats.totalMessages || 0) + 1;
        const actKey = isGroup ? `${from}|${sender}` : sender;
        if (!db.msgActivity) db.msgActivity = {};
        if (!db.msgActivity[actKey]) db.msgActivity[actKey] = { count: 0, lastSeen: 0 };
        db.msgActivity[actKey].count++;
        db.msgActivity[actKey].lastSeen = Date.now();
        // Save stats every 10 messages
        if (db.botStats.totalMessages % 10 === 0) {
          const { saveDB } = require('./lib/database');
          saveDB();
        }
      }

      // ── 4. ANTI-DELETE (groups + private chats) ──────────────────────────
      const protoMsg = msg.message?.protocolMessage;
      if (protoMsg?.type === 0) {
        const deletedKey = protoMsg.key;
        const cached = messageStore[deletedKey.id];
        const antiDeleteGroup = isGroup && getGroup(from)?.antiDelete;
        const antiDeletePrivate = !isGroup && getSetting('antiDeletePrivate');

        if (cached && (antiDeleteGroup || antiDeletePrivate)) {
          const { msg: deletedMsg } = cached;
          const delSender = isGroup ? (deletedKey.participant || sender) : sender;
          const body = getBody(deletedMsg);

          if (body) {
            await sock.sendMessage(ownerJid, {
              text: `╭━━━〔 *DELETED MESSAGE* 〕━━━┈\n┃ 👤 *From:* @${delSender?.split('@')[0]}\n${isGroup ? `┃ 👥 *Group:* ${from}\n` : ''}┃\n┃ 🗑️ *Message:*\n┃ ${body}\n╰━━━━━━━━━━━━━━━━━━┈`,
            }).catch(() => {});
          }

          const m = deletedMsg.message;
          const mediaType = m?.imageMessage ? 'image' : m?.videoMessage ? 'video' : m?.audioMessage ? 'audio' : m?.documentMessage ? 'document' : null;
          if (mediaType) {
            try {
              const buffer = await sock.downloadMediaMessage(deletedMsg);
              await sock.sendMessage(ownerJid, {
                [mediaType]: buffer,
                caption: `╭━━━〔 *DELETED MEDIA* 〕━━━┈\n┃ 👤 From: @${delSender?.split('@')[0]}\n┃ 🗑️ Type: ${mediaType}\n╰━━━━━━━━━━━━━━━━━━┈`,
                ...(mediaType === 'video' ? { mimetype: 'video/mp4' } : {}),
              }).catch(() => {});
            } catch {}
          }
        }
        continue;
      }

      // ── 5. VIEW-ONCE AUTO-REVEAL (for owner in private or all chats) ─────
      if (!msg.key.fromMe) {
        const voMsg = msg.message?.viewOnceMessageV2?.message || msg.message?.viewOnceMessage?.message;
        if (voMsg && getSetting('antiViewOnce')) {
          const voImg = voMsg.imageMessage;
          const voVid = voMsg.videoMessage;
          const innerMsg = { message: voMsg, key: msg.key };
          try {
            const buffer = await sock.downloadMediaMessage(innerMsg);
            const mediaType = voImg ? 'image' : 'video';
            await sock.sendMessage(ownerJid, {
              [mediaType]: buffer,
              caption: `╭━━━〔 *VIEW ONCE REVEALED* 〕━━━┈\n┃ 👁️ *From:* @${sender?.split('@')[0]}\n${isGroup ? `┃ 👥 *Group:* ${from}\n` : ''}┃\n┃ 🧠 MEGAMIND-MD Anti-View-Once\n╰━━━━━━━━━━━━━━━━━━┈`,
              ...(mediaType === 'video' ? { mimetype: 'video/mp4' } : {}),
            }).catch(() => {});
          } catch {}
        }
      }

      // ── 6. GROUP AUTO-MODERATION (anti-link, anti-bad-word, anti-spam) ───
      if (isGroup && !msg.key.fromMe) {
        const group = getGroup(from);
        const body = getBody(msg);
        const db2 = getDB();

        // Blacklist check — ignore blacklisted users
        if (db2.blacklist?.includes(sender)) {
          try {
            const meta = await sock.groupMetadata(from).catch(() => null);
            const botId = (sock.user?.id || '').replace(/:.*@/, '@');
            const botIsAdmin = meta?.participants?.some(p => p.id === botId && p.admin);
            if (botIsAdmin) await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          } catch {}
          continue;
        }

        const isWhitelisted = db2.whitelist?.includes(sender);
        if (!isWhitelisted) {
          try {
            const meta = await sock.groupMetadata(from).catch(() => null);
            const botId = (sock.user?.id || '').replace(/:.*@/, '@');
            const botIsAdmin = meta?.participants?.some(p => p.id === botId && p.admin);
            const senderIsAdmin = meta?.participants?.some(p => p.id === sender && p.admin);

            if (!senderIsAdmin) {
              // Anti-link
              if (group?.antiLink && /https?:\/\//i.test(body)) {
                if (botIsAdmin) {
                  await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                  await sock.sendMessage(from, { text: `⚠️ *Anti-Link:* @${sender?.split('@')[0]}, links are not allowed here!`, mentions: [sender] }).catch(() => {});
                }
                continue;
              }
              // Anti-bad-word
              if (group?.antiBadWord && body) {
                const badWords = ['spam','scam','hack','porn','nude','pussy','dick','fuck','shit','idiot','stupid','dumb','moron'];
                if (badWords.some(w => body.toLowerCase().includes(w))) {
                  if (botIsAdmin) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    await sock.sendMessage(from, { text: `⚠️ *Anti-BadWord:* @${sender?.split('@')[0]}, please be respectful!`, mentions: [sender] }).catch(() => {});
                  }
                  continue;
                }
              }
              // Word filter (custom)
              if (db2.bannedWords?.length && body) {
                const found = db2.bannedWords.find(w => body.toLowerCase().includes(w.toLowerCase()));
                if (found) {
                  if (botIsAdmin) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    await sock.sendMessage(from, { text: `⚠️ *Word Filter:* @${sender?.split('@')[0]}, that word is banned.`, mentions: [sender] }).catch(() => {});
                  }
                  continue;
                }
              }
            }
          } catch {}
        }
      }

      // ── 7. PASS TO COMMAND HANDLER ───────────────────────────────────────
      try {
        await handleMessage(sock, msg);
      } catch (err) {
        logger.error({ err }, 'Message handler error');
      }
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function start() {
  console.log('');
  console.log('  ███╗   ███╗███████╗ ██████╗  █████╗ ███╗   ███╗██╗███╗   ██╗██████╗ ');
  console.log('  ████╗ ████║██╔════╝██╔════╝ ██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗');
  console.log('  ██╔████╔██║█████╗  ██║  ███╗███████║██╔████╔██║██║██╔██╗ ██║██║  ██║');
  console.log('  ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║');
  console.log('  ██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██████╔╝');
  console.log('  ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ');
  console.log('');
  console.log('               🧠 The Most Powerful WhatsApp Bot — v' + settings.botVersion);
  console.log('');

  const port = settings.port;
  server.listen(port, () => logger.info(`🌐 Web UI at http://localhost:${port}`));

  logger.info('Loading plugins...');
  await loadPlugins();
  logger.info(`✅ ${listCommands().length} commands loaded`);

  logger.info('Connecting to WhatsApp...');
  let sock;
  const usePairingCode = process.argv.includes('--pair');
  if (usePairingCode) {
    const phone = process.env.OWNER_NUMBER || '';
    if (!phone) { logger.error('Set OWNER_NUMBER in .env'); process.exit(1); }
    await connectWithPairingCode(phone, () => {});
    sock = getSocket();
  } else {
    sock = await connectToWhatsApp(() => {});
  }

  // Wait for connection before setting up events
  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection === 'open') {
      // Keep-alive heartbeat every 30s
      setInterval(() => sock.sendPresenceUpdate('available').catch(() => {}), 30000);

      startScheduler(sock);

      // Startup notification to owner
      try {
        const uptime = new Date().toLocaleString();
        const db = getDB();
        await sock.sendMessage(settings.ownerNumber, {
          text: `╭━━━〔 *SYSTEM ALERT* 〕━━━┈\n┃ ✅ *MEGAMIND-MD CONNECTED*\n┃\n┃ 🤖 *Bot:* ${settings.botName}\n┃ 👑 *Owner:* ${settings.ownerName}\n┃ 🟢 *Status:* Online & Active\n┃ 🔥 *Mode:* ${settings.mode === 'public' ? '🌍 Public' : '🔒 Private'}\n┃ ⌨️ *Commands:* ${listCommands().length}\n╰━━━━━━━━━━━━━━━━━━┈\n*Engine started successfully!* 🚀`,
        }).catch(() => {});
      } catch {}
    }
  });

  setupGroupEvents(sock);
  setupCallEvents(sock);
  setupMessageEvents(sock);

  logger.info('🧠 MEGAMIND-MD is ready!');
}

start().catch(err => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
