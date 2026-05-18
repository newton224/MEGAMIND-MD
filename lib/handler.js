const { getCommand, listCommands } = require('./pluginLoader');
const { getUser, setUser, incrementStat, getSetting, getDB, saveDB } = require('./database');
const { getBody, getQuoted } = require('./utils');
const logger = require('./logger');
const settings = require('../settings');

const spamMap = new Map();
const floodMap = new Map();
const FLOOD_LIMIT = 7;
const FLOOD_WINDOW_MS = 5000;

function checkFlood(jid) {
  const now = Date.now();
  if (!floodMap.has(jid)) { floodMap.set(jid, { count: 1, start: now }); return false; }
  const t = floodMap.get(jid);
  if (now - t.start > FLOOD_WINDOW_MS) { floodMap.set(jid, { count: 1, start: now }); return false; }
  t.count++;
  return t.count > FLOOD_LIMIT;
}

function checkSpam(jid, text) {
  const now = Date.now();
  if (!spamMap.has(jid)) { spamMap.set(jid, { last: text, count: 1, time: now }); return false; }
  const t = spamMap.get(jid);
  if (now - t.time > 10000) { spamMap.set(jid, { last: text, count: 1, time: now }); return false; }
  if (t.last === text) { t.count++; return t.count >= 3; }
  spamMap.set(jid, { last: text, count: 1, time: now });
  return false;
}

async function handleMessage(sock, msg) {
  if (!msg.message || msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  if (!from || from === 'status@broadcast') return;

  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : from;
  const senderPhone = sender?.split('@')[0] || '';
  const isOwner = senderPhone === settings.ownerNumber.split('@')[0];

  const body = getBody(msg);
  const prefix = settings.prefix;

  if (!body.startsWith(prefix)) return;

  const args = body.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  if (!commandName) return;

  const cmd = getCommand(commandName);
  if (!cmd) return;

  // ── Mode enforcement ──────────────────────────────────────────────────────
  if (settings.mode === 'private' && !isOwner) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 *PRIVATE MODE* 〕━━━┈\n┃ 🔒 Bot is in Private Mode.\n┃ Only *${settings.ownerName}* can use\n┃ commands right now.\n╰━━━━━━━━━━━━━━━━━━┈`,
    }, { quoted: msg });
  }

  // ── Anti-spam ─────────────────────────────────────────────────────────────
  if (settings.antiSpam && !isOwner && body) {
    if (checkSpam(sender, body)) {
      return sock.sendMessage(from, {
        text: `╭━━━〔 *ANTI-SPAM* 〕━━━┈\n┃ ⚠️ @${senderPhone} slow down!\n┃ You are sending the same message\n┃ repeatedly. Please wait.\n╰━━━━━━━━━━━━━━━━━━┈`,
        mentions: [sender],
      }, { quoted: msg });
    }
  }

  // ── Anti-flood ────────────────────────────────────────────────────────────
  if (isGroup && !isOwner) {
    if (checkFlood(sender)) {
      try {
        const meta = await sock.groupMetadata(from).catch(() => null);
        const botId = (sock.user?.id || '').replace(/:.*@/, '@');
        const botIsAdmin = meta?.participants?.some(p => p.id === botId && p.admin);
        if (botIsAdmin) {
          await sock.sendMessage(from, {
            text: `╭━━━〔 *ANTI-FLOOD* 〕━━━┈\n┃ 🌊 @${senderPhone} is flooding!\n┃ Removing from group...\n╰━━━━━━━━━━━━━━━━━━┈`,
            mentions: [sender],
          });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
        }
      } catch {}
      return;
    }
  }

  // ── Permission checks ─────────────────────────────────────────────────────
  if (cmd.ownerOnly && !isOwner) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 *ACCESS DENIED* 〕━━━┈\n┃ 👑 This command is reserved\n┃ for the *bot owner* only.\n╰━━━━━━━━━━━━━━━━━━┈`,
    }, { quoted: msg });
  }

  const user = getUser(sender);
  if (user.banned && !isOwner) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 *BANNED* 〕━━━┈\n┃ 🚫 You are banned from using\n┃ this bot.\n╰━━━━━━━━━━━━━━━━━━┈`,
    }, { quoted: msg });
  }

  let groupMeta = null;
  let botIsAdmin = false;
  let senderIsAdmin = false;

  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(from);
      const botId = (sock.user?.id || '').replace(/:.*@/, '@');
      botIsAdmin = groupMeta.participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
      senderIsAdmin = groupMeta.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch {}
  }

  if (cmd.groupOnly && !isGroup) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 *GROUP ONLY* 〕━━━┈\n┃ 👥 This command can only be\n┃ used inside groups.\n╰━━━━━━━━━━━━━━━━━━┈`,
    }, { quoted: msg });
  }
  if (cmd.adminOnly && !senderIsAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 *ADMINS ONLY* 〕━━━┈\n┃ 🛡️ This command is for\n┃ *group admins* only.\n╰━━━━━━━━━━━━━━━━━━┈`,
    }, { quoted: msg });
  }
  if (cmd.botAdmin && !botIsAdmin) {
    return sock.sendMessage(from, {
      text: `╭━━━〔 *BOT NOT ADMIN* 〕━━━┈\n┃ ⚠️ Make me an *admin* first\n┃ to use this command.\n╰━━━━━━━━━━━━━━━━━━┈`,
    }, { quoted: msg });
  }

  // ── Track command stats ───────────────────────────────────────────────────
  const db = getDB();
  if (!db.botStats) db.botStats = { totalMessages: 0, totalCommands: 0 };
  db.botStats.totalCommands = (db.botStats.totalCommands || 0) + 1;
  if (db.botStats.totalCommands % 10 === 0) saveDB();

  // ── Auto typing ───────────────────────────────────────────────────────────
  if (settings.autoTyping) {
    await sock.sendPresenceUpdate('composing', from).catch(() => {});
  }

  const quoted = getQuoted(msg);
  const text = args.join(' ');

  async function reply(content) {
    if (typeof content === 'string') return sock.sendMessage(from, { text: content }, { quoted: msg });
    return sock.sendMessage(from, content, { quoted: msg });
  }
  async function react(emoji) {
    return sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {});
  }

  const ctx = {
    sock, msg, from, sender, senderPhone, isGroup, isOwner,
    senderIsAdmin, botIsAdmin, groupMeta,
    args, text, body, quoted, reply, react, settings,
  };

  try {
    incrementStat('totalCommands');
    await react('⏳');
    await cmd.execute(ctx);
    await react('✅');
  } catch (err) {
    logger.error({ err, command: commandName }, 'Command error');
    await react('❌');
    await reply(`╭━━━〔 *ERROR* 〕━━━┈\n┃ ❌ ${err.message}\n╰━━━━━━━━━━━━━━━━━━┈`);
  } finally {
    if (settings.autoTyping) {
      await sock.sendPresenceUpdate('paused', from).catch(() => {});
    }
  }
}

module.exports = { handleMessage, listCommands };
