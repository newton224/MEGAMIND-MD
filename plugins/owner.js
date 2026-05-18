const fs = require('fs-extra');
const path = require('path');
const { setSetting, getSetting, setUser } = require('../lib/database');
const { formatUptime } = require('../lib/utils');
const settings = require('../settings');

module.exports = [
  {
    name: 'restart',
    aliases: ['reboot'],
    category: 'Owner',
    description: 'Restart the bot',
    ownerOnly: true,
    async execute({ reply }) {
      await reply('╭━━━〔 *RESTART* 〕━━━┈\n┃ 🔄 Restarting MEGAMIND-MD...\n┃ Please wait a moment.\n╰━━━━━━━━━━━━━━━━━━┈');
      setTimeout(() => process.exit(0), 1500);
    },
  },

  {
    name: 'shutdown',
    aliases: ['stop', 'off'],
    category: 'Owner',
    description: 'Shutdown the bot',
    ownerOnly: true,
    async execute({ reply }) {
      await reply('╭━━━〔 *SHUTDOWN* 〕━━━┈\n┃ ⚠️ Shutting down...\n┃ Goodbye! 👋\n╰━━━━━━━━━━━━━━━━━━┈');
      setTimeout(() => process.exit(0), 1500);
    },
  },

  {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'Owner',
    description: 'Broadcast a message to all groups',
    ownerOnly: true,
    async execute({ sock, reply, text }) {
      if (!text) return reply('⚠️ Usage: *.broadcast <message>*');
      const chats = await sock.groupFetchAllParticipating().catch(() => ({}));
      let sent = 0;
      for (const jid of Object.keys(chats)) {
        try {
          await sock.sendMessage(jid, { text: `╭━━━〔 *📢 BROADCAST* 〕━━━┈\n┃\n┃ ${text}\n┃\n╰━━━━━━━━━━━━━━━━━━┈\n_From: ${settings.ownerName}_` });
          sent++;
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }
      await reply(`╭━━━〔 *BROADCAST* 〕━━━┈\n┃ ✅ Sent to *${sent}* groups\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'ban',
    aliases: [],
    category: 'Owner',
    description: 'Ban a user from using the bot',
    ownerOnly: true,
    async execute({ reply, args, msg, sock, from }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('⚠️ Usage: Reply to a message with *.ban* or *.ban <number>*');
      setUser(target, { banned: true });
      await sock.sendMessage(from, { text: `╭━━━〔 *USER BANNED* 〕━━━┈\n┃ 🚫 @${target.split('@')[0]} has been banned.\n┃ They can no longer use the bot.\n╰━━━━━━━━━━━━━━━━━━┈`, mentions: [target] });
    },
  },

  {
    name: 'unban',
    aliases: [],
    category: 'Owner',
    description: 'Unban a user',
    ownerOnly: true,
    async execute({ reply, args, msg, sock, from }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('⚠️ Usage: Reply to a message with *.unban*');
      setUser(target, { banned: false });
      await sock.sendMessage(from, { text: `╭━━━〔 *USER UNBANNED* 〕━━━┈\n┃ ✅ @${target.split('@')[0]} is now unbanned.\n╰━━━━━━━━━━━━━━━━━━┈`, mentions: [target] });
    },
  },

  {
    name: 'block',
    aliases: [],
    category: 'Owner',
    description: 'Block a user on WhatsApp',
    ownerOnly: true,
    async execute({ sock, reply, args, msg, from }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('⚠️ Reply to a message or provide a number');
      await sock.updateBlockStatus(target, 'block');
      await sock.sendMessage(from, { text: `🚫 *Blocked* @${target.split('@')[0]}`, mentions: [target] });
    },
  },

  {
    name: 'unblock',
    aliases: [],
    category: 'Owner',
    description: 'Unblock a user on WhatsApp',
    ownerOnly: true,
    async execute({ sock, reply, args, msg, from }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('⚠️ Reply to a message or provide a number');
      await sock.updateBlockStatus(target, 'unblock');
      await sock.sendMessage(from, { text: `✅ *Unblocked* @${target.split('@')[0]}`, mentions: [target] });
    },
  },

  {
    name: 'setppbot',
    aliases: ['setbotpp'],
    category: 'Owner',
    description: 'Set bot profile picture',
    ownerOnly: true,
    async execute({ sock, reply, msg, quoted }) {
      const imgMsg = quoted?.message?.imageMessage || msg.message?.imageMessage;
      if (!imgMsg) return reply('⚠️ Reply to an image with *.setppbot*');
      const buffer = await sock.downloadMediaMessage(quoted || msg);
      await sock.updateProfilePicture(sock.user.id, buffer);
      await reply('╭━━━〔 *PROFILE PICTURE* 〕━━━┈\n┃ ✅ Bot profile picture updated!\n╰━━━━━━━━━━━━━━━━━━┈');
    },
  },

  {
    name: 'setbio',
    aliases: ['setbotbio'],
    category: 'Owner',
    description: 'Set bot status/bio',
    ownerOnly: true,
    async execute({ sock, reply, text }) {
      if (!text) return reply('⚠️ Usage: *.setbio <bio text>*');
      await sock.updateProfileStatus(text);
      await reply('╭━━━〔 *BIO UPDATED* 〕━━━┈\n┃ ✅ Bot bio updated!\n╰━━━━━━━━━━━━━━━━━━┈');
    },
  },

  {
    name: 'autoread',
    aliases: [],
    category: 'Owner',
    description: 'Toggle auto read messages',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on' ? true : args[0] === 'off' ? false : !getSetting('autoRead');
      setSetting('autoRead', val);
      await reply(`╭━━━〔 *AUTO READ* 〕━━━┈\n┃ 📖 Status: *${val ? 'ON ✅' : 'OFF ❌'}*\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'anticall',
    aliases: [],
    category: 'Owner',
    description: 'Toggle anti-call',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on' ? true : args[0] === 'off' ? false : !getSetting('antiCall');
      setSetting('antiCall', val);
      await reply(`╭━━━〔 *ANTI-CALL* 〕━━━┈\n┃ 📵 Status: *${val ? 'ON ✅' : 'OFF ❌'}*\n┃\n┃ ${val ? 'Calls will be auto-rejected.' : 'Anti-call is disabled.'}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'botmode',
    aliases: ['mode'],
    category: 'Owner',
    description: 'Set bot mode (public/private)',
    ownerOnly: true,
    async execute({ reply, args }) {
      const mode = args[0]?.toLowerCase();
      if (!mode) {
        return reply(`╭━━━〔 *BOT MODE* 〕━━━┈\n┃ 🔥 *Current Mode:* ${settings.mode === 'public' ? '🌍 PUBLIC' : '🔒 PRIVATE'}\n┃\n┃ *.botmode public* — Everyone\n┃ *.botmode private* — Owner only\n╰━━━━━━━━━━━━━━━━━━┈`);
      }
      if (!['public', 'private'].includes(mode)) return reply('⚠️ Usage: *.botmode public* OR *.botmode private*');
      settings.mode = mode;
      await reply(`╭━━━〔 *MODE CHANGED* 〕━━━┈\n┃ ${mode === 'public' ? '🌍' : '🔒'} *Mode:* ${mode.toUpperCase()}\n┃\n┃ ${mode === 'public' ? 'Everyone can now use commands.' : `Only ${settings.ownerName} can use commands.`}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'join',
    aliases: [],
    category: 'Owner',
    description: 'Join a group via invite link',
    ownerOnly: true,
    async execute({ sock, reply, args }) {
      const link = args[0];
      if (!link) return reply('⚠️ Usage: *.join <invite_link>*');
      const code = link.split('https://chat.whatsapp.com/')[1];
      if (!code) return reply('❌ Invalid WhatsApp invite link');
      await sock.groupAcceptInvite(code);
      await reply('╭━━━〔 *GROUP JOINED* 〕━━━┈\n┃ ✅ Successfully joined the group!\n╰━━━━━━━━━━━━━━━━━━┈');
    },
  },

  {
    name: 'leave',
    aliases: [],
    category: 'Owner',
    description: 'Leave a group',
    ownerOnly: true,
    groupOnly: true,
    async execute({ sock, reply, from }) {
      await reply('╭━━━〔 *LEAVING GROUP* 〕━━━┈\n┃ 👋 Goodbye everyone!\n╰━━━━━━━━━━━━━━━━━━┈');
      await sock.groupLeave(from);
    },
  },

  {
    name: 'repo',
    aliases: ['github', 'source'],
    category: 'Owner',
    description: 'Show bot repository link',
    async execute({ reply }) {
      await reply(`╭━━━〔 *MEGAMIND-MD SOURCE* 〕━━━┈\n┃ 📦 *GitHub:*\n┃ https://github.com/MEGAMIND-MD\n┃\n┃ ⭐ Star the repo if you like it!\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'pairsite',
    aliases: ['getid', 'session', 'pair'],
    category: 'Owner',
    description: 'Get the pairing site link',
    async execute({ reply }) {
      const url = process.env.PAIR_SITE_URL || process.env.UPTIME_URL || 'https://your-pairing-site.onrender.com';
      await reply(`╭━━━〔 *PAIRING SITE* 〕━━━┈\n┃ 🌐 *Link:* ${url}\n┃\n┃ Visit to get your SESSION ID.\n┃ Each visitor gets their own\n┃ unique session — safe to share!\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'botconnected',
    aliases: ['connection'],
    category: 'Owner',
    description: 'Show bot connection status',
    async execute({ sock, reply }) {
      const user = sock.user;
      const mem = process.memoryUsage();
      await reply(`╭━━━〔 *CONNECTION INFO* 〕━━━┈\n┃ 🟢 *Status:* Connected\n┃ 📱 *Number:* ${user?.id?.split(':')[0] || 'Unknown'}\n┃ 🤖 *Name:* ${user?.name || settings.botName}\n┃ 💻 *Platform:* ${process.platform}\n┃ 🌿 *Node.js:* ${process.version}\n┃ ⏱️ *Uptime:* ${formatUptime(process.uptime())}\n┃ 💾 *RAM:* ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n┃ 🔥 *Mode:* ${settings.mode}\n┃ 🔤 *Prefix:* \`${settings.prefix}\`\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'runtime',
    aliases: ['uptime'],
    category: 'Owner',
    description: 'Show bot runtime',
    async execute({ reply }) {
      const h = Math.floor(process.uptime() / 3600);
      const m = Math.floor((process.uptime() % 3600) / 60);
      const s = Math.floor(process.uptime() % 60);
      await reply(`╭━━━〔 *BOT RUNTIME* 〕━━━┈\n┃ ⏱️ *Uptime:* ${h}h ${m}m ${s}s\n┃ 🧠 MEGAMIND-MD is running strong!\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'ping',
    aliases: ['speed'],
    category: 'General',
    description: 'Check bot response speed',
    async execute({ reply, msg }) {
      const ping = (Date.now() - msg.messageTimestamp * 1000).toFixed(2);
      await reply(`╭━━━〔 *MEGAMIND PING* 〕━━━┈\n┃\n┃ ⚡ *Speed:* ${ping} ms\n┃ 🤖 *Bot:* ${settings.botName}\n┃ 📡 *Status:* Online\n┃ 🔥 *Mode:* ${settings.mode === 'public' ? '🌍 Public' : '🔒 Private'}\n┃\n╰━━━━━━━━━━━━━━━━━━┈\n*MEGAMIND-MD is blazing fast!* 🚀`);
    },
  },

  {
    name: 'system',
    aliases: ['sysinfo', 'specs'],
    category: 'Owner',
    description: 'Show system information',
    async execute({ reply }) {
      try {
        const si = require('systeminformation');
        const [cpu, mem, os] = await Promise.all([
          si.cpu().catch(() => ({})),
          si.mem().catch(() => ({})),
          si.osInfo().catch(() => ({})),
        ]);
        const totalMem = mem.total ? Math.round(mem.total / 1024 / 1024 / 1024 * 10) / 10 : '?';
        const usedMem = mem.used ? Math.round(mem.used / 1024 / 1024 / 1024 * 10) / 10 : '?';
        await reply(`╭━━━〔 *SYSTEM INFO* 〕━━━┈\n┃ 🖥️ *OS:* ${os.distro || process.platform} ${os.release || ''}\n┃ 💻 *CPU:* ${cpu.manufacturer || ''} ${cpu.brand || 'Unknown'}\n┃ 🔢 *Cores:* ${cpu.cores || 'N/A'}\n┃ 💾 *RAM:* ${usedMem}GB / ${totalMem}GB\n┃ 🌿 *Node:* ${process.version}\n┃ 🆔 *PID:* ${process.pid}\n┃ ⏱️ *Uptime:* ${formatUptime(process.uptime())}\n┃ 🧠 *Bot RAM:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n╰━━━━━━━━━━━━━━━━━━┈`);
      } catch {
        const mem = process.memoryUsage();
        await reply(`╭━━━〔 *SYSTEM INFO* 〕━━━┈\n┃ 💻 *Platform:* ${process.platform}\n┃ 🌿 *Node:* ${process.version}\n┃ 🆔 *PID:* ${process.pid}\n┃ 🧠 *RAM:* ${Math.round(mem.heapUsed / 1024 / 1024)}MB\n┃ ⏱️ *Uptime:* ${formatUptime(process.uptime())}\n╰━━━━━━━━━━━━━━━━━━┈`);
      }
    },
  },

  {
    name: 'autoviewstatus',
    aliases: ['viewstatus'],
    category: 'Owner',
    description: 'Toggle auto-view WhatsApp statuses',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on' ? true : args[0] === 'off' ? false : !getSetting('autoViewStatus');
      setSetting('autoViewStatus', val);
      await reply(`╭━━━〔 *AUTO-VIEW STATUS* 〕━━━┈\n┃ 👀 Status: *${val ? 'ON ✅' : 'OFF ❌'}*\n┃\n┃ ${val ? 'Bot will auto-view & mark\n┃ all statuses as viewed.' : 'Auto-view status is disabled.'}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },
];
