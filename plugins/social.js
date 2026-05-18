const axios = require('axios');
const { getDB, setScheduledMessages } = require('../lib/database');
const settings = require('../settings');

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"').replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'");
}

module.exports = [
  // ── QUIZ ──────────────────────────────────────────────────────────────────
  {
    name: 'quiz',
    aliases: ['trivia'],
    category: 'Fun',
    description: 'Random trivia quiz question',
    async execute({ sock, from, reply, msg }) {
      try {
        const data = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 10000 }).then(r => r.data);
        if (!data.results?.length) throw new Error('No data');
        const q = data.results[0];
        const question = decodeHtml(q.question);
        const correct = decodeHtml(q.correct_answer);
        const allAnswers = [...q.incorrect_answers.map(a => decodeHtml(a)), correct].sort(() => Math.random() - 0.5);
        const labels = ['A', 'B', 'C', 'D'];
        const correctLabel = labels[allAnswers.indexOf(correct)];
        const optionsText = allAnswers.map((a, i) => `┃ *${labels[i]}.* ${a}`).join('\n');
        await reply(`╭━━━〔 *QUIZ TIME!* 〕━━━┈\n┃ 🧠 *Category:* ${decodeHtml(q.category)}\n┃ ⚡ *Difficulty:* ${q.difficulty.toUpperCase()}\n┃\n┃ ❓ *${question}*\n┃\n${optionsText}\n╰━━━━━━━━━━━━━━━━━━┈\n_Answer revealed in 30 seconds..._`);
        setTimeout(async () => {
          await sock.sendMessage(from, { text: `✅ *Quiz Answer:*\n\nThe correct answer was *${correctLabel}. ${correct}* 🎉` });
        }, 30000);
      } catch {
        await reply('❌ Could not fetch quiz question. Try again.');
      }
    },
  },

  // ── HOROSCOPE ─────────────────────────────────────────────────────────────
  {
    name: 'horoscope',
    aliases: ['horo', 'zodiac'],
    category: 'Fun',
    description: 'Daily horoscope for a zodiac sign',
    async execute({ reply, args }) {
      const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
      const sign = args[0]?.toLowerCase();
      if (!sign || !signs.includes(sign)) {
        return reply(`⚠️ Usage: *.horoscope [sign]*\n\n*Signs:* ${signs.join(', ')}`);
      }
      try {
        const data = await axios.get(`https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign}&day=TODAY`, { timeout: 10000 }).then(r => r.data);
        if (!data.data) throw new Error('No data');
        await reply(`╭━━━〔 *HOROSCOPE* 〕━━━┈\n┃ ♈ *Sign:* ${sign.charAt(0).toUpperCase() + sign.slice(1)}\n┃ 📅 *Date:* ${data.data.date}\n╰━━━━━━━━━━━━━━━━━━┈\n\n${data.data.horoscope_data}`);
      } catch {
        await reply(`❌ Could not fetch horoscope for *${sign}*. Try again.`);
      }
    },
  },

  // ── GIF ───────────────────────────────────────────────────────────────────
  {
    name: 'gif',
    aliases: ['gifs'],
    category: 'Fun',
    description: 'Search and send a GIF',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('⚠️ Usage: *.gif funny cats*');
      const query = text;
      try {
        const data = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=20&rating=pg`, { timeout: 10000 }).then(r => r.data);
        if (!data.data?.length) throw new Error('No GIFs found');
        const gif = data.data[Math.floor(Math.random() * data.data.length)];
        const gifUrl = gif.images.original.url;
        await sock.sendMessage(from, {
          video: { url: gifUrl },
          caption: `🎞️ *GIF:* ${query}\n_Powered by Giphy_`,
          gifPlayback: true,
        }, { quoted: msg });
      } catch {
        await reply(`❌ Could not find a GIF for: *${query}*`);
      }
    },
  },

  // ── POLL ──────────────────────────────────────────────────────────────────
  {
    name: 'poll',
    aliases: ['vote'],
    category: 'Group',
    description: 'Create a group poll',
    groupOnly: true,
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('⚠️ Usage: *.poll Question | Option1 | Option2 | Option3*\n\nExample: *.poll Best color? | Red | Blue | Green*');
      const parts = text.split('|').map(p => p.trim());
      if (parts.length < 3) return reply('⚠️ Need at least 2 options. Use: *.poll Question | Option1 | Option2*');
      const question = parts[0];
      const options = parts.slice(1);
      const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      const optionsText = options.map((opt, i) => `┃ ${emojis[i]} ${opt}`).join('\n');
      await sock.sendMessage(from, {
        text: `╭━━━〔 *📊 POLL* 〕━━━┈\n┃ ❓ *${question}*\n┃\n${optionsText}\n╰━━━━━━━━━━━━━━━━━━┈\n_React with the number to vote!_`,
      }, { quoted: msg });
    },
  },

  // ── LOCKDOWN ──────────────────────────────────────────────────────────────
  {
    name: 'lockdown',
    aliases: ['lock'],
    category: 'Group',
    description: 'Lock/unlock the group',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, args }) {
      const sub = args[0]?.toLowerCase();
      if (sub === 'off') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await reply(`╭━━━〔 *LOCKDOWN LIFTED* 〕━━━┈\n┃ 🔓 Everyone can send messages\n┃ again.\n╰━━━━━━━━━━━━━━━━━━┈`);
      } else {
        await sock.groupSettingUpdate(from, 'announcement');
        const minutes = parseInt(args[0]);
        await reply(`╭━━━〔 *GROUP LOCKED DOWN* 〕━━━┈\n┃ 🔒 Only admins can send messages.\n┃ ${!isNaN(minutes) ? `⏱️ Ends in *${minutes} minute(s)*.` : '_Use .lockdown off to unlock._'}\n╰━━━━━━━━━━━━━━━━━━┈`);
        if (!isNaN(minutes)) {
          setTimeout(async () => {
            try {
              await sock.groupSettingUpdate(from, 'not_announcement');
              await sock.sendMessage(from, { text: '🔓 *Lockdown ended automatically.*\nEveryone can send messages again.' });
            } catch {}
          }, minutes * 60 * 1000);
        }
      }
    },
  },

  // ── SCHEDULE ──────────────────────────────────────────────────────────────
  {
    name: 'schedule',
    aliases: ['schedulemsg', 'sched'],
    category: 'Owner',
    description: 'Schedule a message to be sent at a specific time',
    ownerOnly: true,
    async execute({ reply, args, from }) {
      const db = getDB();
      const sub = args[0]?.toLowerCase();

      if (sub === 'list') {
        if (!db.scheduledMessages?.length) return reply('📋 No scheduled messages.');
        const list = db.scheduledMessages.map((s, i) => `${i + 1}. [${s.time}] ${s.message.slice(0, 40)}...`).join('\n');
        return reply(`╭━━━〔 *SCHEDULED MESSAGES* 〕━━━┈\n${list}\n╰━━━━━━━━━━━━━━━━━━┈`);
      }
      if (sub === 'clear') {
        setScheduledMessages([]);
        return reply('🗑️ *All scheduled messages cleared.*');
      }

      const time = args[0];
      const schedMsg = args.slice(1).join(' ');
      if (!time || !schedMsg || !/^\d{2}:\d{2}$/.test(time)) {
        return reply('⚠️ Usage: *.schedule HH:MM Your message*\nExample: *.schedule 08:00 Good morning everyone!*\n\nOther:\n*.schedule list* — View all\n*.schedule clear* — Delete all');
      }

      const id = Date.now().toString();
      const msgs = db.scheduledMessages || [];
      msgs.push({ id, chatJid: from, message: schedMsg, time, repeat: false });
      setScheduledMessages(msgs);
      await reply(`╭━━━〔 *MESSAGE SCHEDULED* 〕━━━┈\n┃ ⏰ *Time:* ${time}\n┃ 📝 *Message:* ${schedMsg}\n╰━━━━━━━━━━━━━━━━━━┈\n_The message will be sent once at ${time}. Bot must be online._`);
    },
  },

  // ── TOP MEMBERS ───────────────────────────────────────────────────────────
  {
    name: 'topmembers',
    aliases: ['topactive', 'top'],
    category: 'Group',
    description: 'Show most active group members',
    groupOnly: true,
    async execute({ sock, from, reply, msg }) {
      const db = getDB();
      const prefix = from + '|';
      const activity = Object.entries(db.msgActivity || {})
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => ({ jid: k.replace(prefix, ''), ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      if (!activity.length) return reply('📊 No activity data yet. Start chatting!');
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
      const topList = activity.map((u, i) => `┃ ${medals[i]} @${u.jid.split('@')[0]} — *${u.count} messages*`).join('\n');
      const mentions = activity.map(u => u.jid);
      await sock.sendMessage(from, {
        text: `╭━━━〔 *TOP MEMBERS* 〕━━━┈\n${topList}\n╰━━━━━━━━━━━━━━━━━━┈`,
        mentions,
      }, { quoted: msg });
    },
  },

  // ── LAST SEEN ─────────────────────────────────────────────────────────────
  {
    name: 'lastseen',
    aliases: ['ls', 'seen'],
    category: 'Group',
    description: 'Check when a user was last active',
    async execute({ sock, from, reply, msg, sender, isGroup }) {
      const db = getDB();
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentionedJid[0] || sender;
      const actKey = isGroup ? `${from}|${target}` : target;
      const data = db.msgActivity?.[actKey];
      if (!data?.lastSeen) {
        return sock.sendMessage(from, {
          text: `❓ No activity data for @${target.split('@')[0]} yet.\n_They may not have sent a message while the bot was running._`,
          mentions: [target],
        }, { quoted: msg });
      }
      const timeAgo = Math.floor((Date.now() - data.lastSeen) / 60000);
      const timeStr = timeAgo < 60 ? `${timeAgo} minute(s) ago` : timeAgo < 1440 ? `${Math.floor(timeAgo / 60)} hour(s) ago` : `${Math.floor(timeAgo / 1440)} day(s) ago`;
      await sock.sendMessage(from, {
        text: `╭━━━〔 *LAST SEEN* 〕━━━┈\n┃ 👤 *User:* @${target.split('@')[0]}\n┃ ⏱️ *Last active:* ${timeStr}\n┃ 📅 *Date:* ${new Date(data.lastSeen).toLocaleString()}\n┃ 💬 *Total messages:* ${data.count}\n╰━━━━━━━━━━━━━━━━━━┈`,
        mentions: [target],
      }, { quoted: msg });
    },
  },

  // ── PROFILE PICTURE VIEWER ────────────────────────────────────────────────
  {
    name: 'profile',
    aliases: ['pfp', 'getpp'],
    category: 'Utility',
    description: "View someone's profile picture",
    async execute({ sock, from, reply, msg, sender }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentionedJid[0] || sender;
      try {
        const ppUrl = await sock.profilePictureUrl(target, 'image');
        const buf = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 15000 }).then(r => Buffer.from(r.data));
        await sock.sendMessage(from, {
          image: buf,
          caption: `🖼️ *Profile picture of @${target.split('@')[0]}*`,
          mentions: [target],
        }, { quoted: msg });
      } catch {
        await reply(`❌ Could not get profile picture. The user may have it hidden.`);
      }
    },
  },

  // ── CALC ──────────────────────────────────────────────────────────────────
  {
    name: 'calc',
    aliases: ['calculate', 'math'],
    category: 'Utility',
    description: 'Calculator',
    async execute({ reply, text }) {
      if (!text) return reply('⚠️ Usage: *.calc 2+2*3*');
      try {
        const safe = text.replace(/[^0-9+\-*/().% ]/g, '');
        if (!safe.trim()) throw new Error('Invalid expression');
        const result = Function('"use strict"; return (' + safe + ')')();
        await reply(`╭━━━〔 *CALCULATOR* 〕━━━┈\n┃ 📐 *Expression:* ${text}\n┃ ✅ *Result:* ${result}\n╰━━━━━━━━━━━━━━━━━━┈`);
      } catch {
        await reply('❌ Invalid math expression. Example: *.calc 2+2*3*');
      }
    },
  },
];
