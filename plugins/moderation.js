const fs = require('fs-extra');
const path = require('path');
const {
  getWarnings, addWarning, resetWarnings,
  addToBlacklist, removeFromBlacklist,
  addToWhitelist, removeFromWhitelist,
  addBannedWord, removeBannedWord,
  getDB, setSetting, getSetting,
} = require('../lib/database');
const settings = require('../settings');

module.exports = [
  // ── WARN ──────────────────────────────────────────────────────────────────
  {
    name: 'warn',
    aliases: [],
    category: 'Moderation',
    description: 'Warn a group member',
    groupOnly: true,
    adminOnly: true,
    async execute({ sock, from, reply, msg, args, sender }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentionedJid.length) return reply('⚠️ Tag the user. Example: *.warn @user breaking rules*');
      const target = mentionedJid[0];
      const reason = args.slice(1).join(' ') || 'No reason given';
      const warn = addWarning(from, target, reason);
      const count = warn.count;

      await sock.sendMessage(from, {
        text: `╭━━━〔 *WARNING ${count}/3* 〕━━━┈\n┃ 👤 *User:* @${target.split('@')[0]}\n┃ 📋 *Reason:* ${reason}\n┃\n┃ ${count >= 3 ? '🚨 *MAX WARNINGS — Removing...*' : `_${3 - count} warning(s) left before kick._`}\n╰━━━━━━━━━━━━━━━━━━┈`,
        mentions: [target],
      }, { quoted: msg });

      if (count >= 3) {
        try {
          await sock.groupParticipantsUpdate(from, [target], 'remove');
          resetWarnings(from, target);
          await sock.sendMessage(from, { text: `🚨 @${target.split('@')[0]} was removed after 3 warnings.`, mentions: [target] });
        } catch {}
      }
    },
  },

  // ── WARNINGS ──────────────────────────────────────────────────────────────
  {
    name: 'warnings',
    aliases: ['warnlist', 'checkwarn'],
    category: 'Moderation',
    description: 'Check warnings for a user',
    groupOnly: true,
    async execute({ sock, from, reply, msg, sender }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentionedJid[0] || sender;
      const warn = getWarnings(from, target);
      if (!warn.count) {
        return sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} has *no warnings*.`, mentions: [target] }, { quoted: msg });
      }
      const reasons = warn.reasons.map((r, i) => `┃   ${i + 1}. ${r}`).join('\n');
      await sock.sendMessage(from, {
        text: `╭━━━〔 *WARNINGS* 〕━━━┈\n┃ 👤 *User:* @${target.split('@')[0]}\n┃ ⚠️ *Count:* ${warn.count}/3\n┃\n┃ *Reasons:*\n${reasons}\n╰━━━━━━━━━━━━━━━━━━┈`,
        mentions: [target],
      }, { quoted: msg });
    },
  },

  // ── RESETWARN ─────────────────────────────────────────────────────────────
  {
    name: 'resetwarn',
    aliases: ['clearwarn'],
    category: 'Moderation',
    description: 'Reset warnings for a user',
    groupOnly: true,
    adminOnly: true,
    async execute({ sock, from, reply, msg }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentionedJid.length) return reply('⚠️ Tag the user. Example: *.resetwarn @user*');
      const target = mentionedJid[0];
      resetWarnings(from, target);
      await sock.sendMessage(from, { text: `✅ *Warnings reset* for @${target.split('@')[0]}.`, mentions: [target] }, { quoted: msg });
    },
  },

  // ── WHITELIST ─────────────────────────────────────────────────────────────
  {
    name: 'whitelist',
    aliases: ['wl'],
    category: 'Moderation',
    description: 'Manage whitelist (exempt from moderation)',
    adminOnly: true,
    async execute({ sock, from, reply, msg, args }) {
      const db = getDB();
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const sub = args[0]?.toLowerCase();
      if (sub === 'add' && mentionedJid.length) {
        mentionedJid.forEach(addToWhitelist);
        await sock.sendMessage(from, {
          text: `✅ *Added to whitelist:*\n${mentionedJid.map(j => '@' + j.split('@')[0]).join(', ')}\n_These users are exempt from all auto-moderation._`,
          mentions: mentionedJid,
        }, { quoted: msg });
      } else if (sub === 'remove' && mentionedJid.length) {
        mentionedJid.forEach(removeFromWhitelist);
        await reply('✅ *Removed from whitelist.*');
      } else if (sub === 'list') {
        const wl = db.whitelist || [];
        if (!wl.length) return reply('📋 Whitelist is empty.');
        await sock.sendMessage(from, { text: `📋 *Whitelist (${wl.length}):*\n${wl.map(j => '@' + j.split('@')[0]).join(', ')}`, mentions: wl }, { quoted: msg });
      } else {
        await reply('⚠️ Usage:\n*.whitelist add @user* — Exempt from moderation\n*.whitelist remove @user* — Remove exemption\n*.whitelist list* — View all');
      }
    },
  },

  // ── BLACKLIST ─────────────────────────────────────────────────────────────
  {
    name: 'blacklist',
    aliases: ['bl'],
    category: 'Moderation',
    description: 'Manage blacklist (messages auto-deleted)',
    adminOnly: true,
    async execute({ sock, from, reply, msg, args }) {
      const db = getDB();
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const sub = args[0]?.toLowerCase();
      if (sub === 'add' && mentionedJid.length) {
        mentionedJid.forEach(addToBlacklist);
        await sock.sendMessage(from, {
          text: `🚫 *Added to blacklist:*\n${mentionedJid.map(j => '@' + j.split('@')[0]).join(', ')}\n_Their messages will be auto-deleted._`,
          mentions: mentionedJid,
        }, { quoted: msg });
      } else if (sub === 'remove' && mentionedJid.length) {
        mentionedJid.forEach(removeFromBlacklist);
        await reply('✅ *Removed from blacklist.*');
      } else if (sub === 'list') {
        const bl = db.blacklist || [];
        if (!bl.length) return reply('📋 Blacklist is empty.');
        await sock.sendMessage(from, { text: `🚫 *Blacklist (${bl.length}):*\n${bl.map(j => '@' + j.split('@')[0]).join(', ')}`, mentions: bl }, { quoted: msg });
      } else {
        await reply('⚠️ Usage:\n*.blacklist add @user* — Auto-delete their messages\n*.blacklist remove @user* — Remove\n*.blacklist list* — View all');
      }
    },
  },

  // ── WORD FILTER ───────────────────────────────────────────────────────────
  {
    name: 'wordfilter',
    aliases: ['bannedword', 'filter'],
    category: 'Moderation',
    description: 'Manage custom word filter',
    adminOnly: true,
    async execute({ reply, args }) {
      const db = getDB();
      const sub = args[0]?.toLowerCase();
      const word = args[1]?.toLowerCase();
      if (sub === 'add' && word) {
        addBannedWord(word);
        await reply(`✅ *"${word}"* added to word filter.`);
      } else if (sub === 'remove' && word) {
        removeBannedWord(word);
        await reply(`✅ *"${word}"* removed from word filter.`);
      } else if (sub === 'list') {
        const words = db.bannedWords || [];
        if (!words.length) return reply('📋 Word filter is empty.');
        await reply(`📋 *Banned Words (${words.length}):*\n${words.join(', ')}`);
      } else if (sub === 'clear') {
        db.bannedWords = [];
        const { saveDB } = require('../lib/database');
        saveDB();
        await reply('🗑️ *Word filter cleared.*');
      } else {
        await reply('⚠️ Usage:\n*.wordfilter add <word>*\n*.wordfilter remove <word>*\n*.wordfilter list*\n*.wordfilter clear*');
      }
    },
  },

  // ── SET WELCOME IMAGE ─────────────────────────────────────────────────────
  {
    name: 'setwelcomeimg',
    aliases: ['setwelcomeimage', 'welcomeimg'],
    category: 'Moderation',
    description: 'Set welcome image for new members',
    groupOnly: true,
    adminOnly: true,
    async execute({ sock, from, reply, msg, quoted }) {
      const target = quoted || msg;
      const m = target?.message;
      const imgMsg = m?.imageMessage || m?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!imgMsg) return reply('⚠️ Send or reply to an image with *.setwelcomeimg*');
      const buffer = await sock.downloadMediaMessage(target);
      const dest = path.resolve(__dirname, '../media/welcome_image.jpg');
      await fs.writeFile(dest, buffer);
      await reply('🖼️ *Welcome image set!* New members will see this image when they join.');
    },
  },

  // ── ANTI-VIEW-ONCE toggle ─────────────────────────────────────────────────
  {
    name: 'antiviewonce',
    aliases: ['viewonce', 'avo'],
    category: 'Moderation',
    description: 'Toggle auto-reveal of view-once messages',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on' ? true : args[0] === 'off' ? false : !getSetting('antiViewOnce');
      setSetting('antiViewOnce', val);
      await reply(`╭━━━〔 *ANTI-VIEW-ONCE* 〕━━━┈\n┃ 👁️ Status: *${val ? 'ON ✅' : 'OFF ❌'}*\n┃\n┃ ${val ? 'View-once messages will be\n┃ revealed and forwarded to you.' : 'View-once messages are\n┃ no longer intercepted.'}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  // ── ANTI-DELETE (private) toggle ──────────────────────────────────────────
  {
    name: 'antidelete',
    aliases: ['antidel'],
    category: 'Moderation',
    description: 'Toggle anti-delete (reveals deleted messages)',
    ownerOnly: true,
    async execute({ reply, args, from, isGroup, setGroup: _sg, getGroup: _gg }) {
      const val = args[0] === 'on' ? true : args[0] === 'off' ? false : !getSetting('antiDeletePrivate');
      setSetting('antiDeletePrivate', val);
      await reply(`╭━━━〔 *ANTI-DELETE* 〕━━━┈\n┃ 🗑️ Status: *${val ? 'ON ✅' : 'OFF ❌'}*\n┃\n┃ ${val ? 'Deleted messages will be\n┃ revealed and forwarded to you.' : 'Anti-delete is disabled.'}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  // ── AUTO-STATUS-REPLY toggle ──────────────────────────────────────────────
  {
    name: 'autostatusreply',
    aliases: ['statusreply'],
    category: 'Moderation',
    description: 'Toggle auto-reply when you view a status',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on' ? true : args[0] === 'off' ? false : !getSetting('autoStatusReply');
      setSetting('autoStatusReply', val);
      await reply(`╭━━━〔 *AUTO STATUS REPLY* 〕━━━┈\n┃ 💌 Status: *${val ? 'ON ✅' : 'OFF ❌'}*\n┃\n┃ ${val ? 'Bot will reply to people\n┃ when it views their status.' : 'Status auto-reply disabled.'}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },
];
