const { listCommands } = require('../lib/pluginLoader');
const { getSetting, getDB } = require('../lib/database');
const { formatUptime } = require('../lib/utils');
const settings = require('../settings');
const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    name: 'menu',
    aliases: ['help', 'start', 'commands', 'list'],
    category: 'General',
    description: 'Show all bot commands',
    async execute({ sock, from, msg, reply, isOwner }) {
      const p = settings.prefix;
      const db = getDB();
      const uptime = formatUptime(process.uptime());
      const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const totalCmds = listCommands().length;

      const menuText = `╭━━━〔 🧠 *MEGAMIND-MD* 〕━━━┈
┃
┃ 🤖 *Bot:* ${settings.botName}
┃ 👑 *Owner:* ${settings.ownerName}
┃ ⏱️ *Uptime:* ${uptime}
┃ 💬 *Messages:* ${db.botStats?.totalMessages || 0}
┃ ⌨️ *Commands:* ${db.botStats?.totalCommands || 0}
┃ 🔥 *Mode:* ${settings.mode === 'public' ? '🌍 Public' : '🔒 Private'}
┃
┃ 🛡️ *Anti-Delete:* ${getSetting('antiDeletePrivate') ? 'ON ✅' : 'OFF ❌'}
┃ 👁️ *Anti-View-Once:* ${getSetting('antiViewOnce') ? 'ON ✅' : 'OFF ❌'}
┃ 👀 *Auto-View Status:* ${getSetting('autoViewStatus') !== false ? 'ON ✅' : 'OFF ❌'}
┃ 💌 *Status Reply:* ${getSetting('autoStatusReply') ? 'ON ✅' : 'OFF ❌'}
┃ 📵 *Anti-Call:* ${getSetting('antiCall') ? 'ON ✅' : 'OFF ❌'}
┃
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 👑 *OWNER COMMANDS* 〕━━━┈
┃ ${p}restart      │ Restart bot
┃ ${p}shutdown     │ Stop bot
┃ ${p}broadcast    │ Broadcast message
┃ ${p}ban / unban  │ Ban users from bot
┃ ${p}block/unblock│ Block WA users
┃ ${p}setppbot     │ Set bot profile pic
┃ ${p}setbio       │ Set bot bio/status
┃ ${p}autoread     │ Toggle auto-read
┃ ${p}anticall     │ Toggle anti-call
┃ ${p}antiviewonce │ Toggle view-once reveal
┃ ${p}antidelete   │ Toggle anti-delete (private)
┃ ${p}autoviewstatus│ Toggle auto-view status
┃ ${p}autostatusreply│ Toggle status reply
┃ ${p}botmode      │ Set public/private
┃ ${p}join / leave │ Join/leave a group
┃ ${p}repo         │ Bot source link
┃ ${p}pairsite     │ Pairing site link
┃ ${p}botconnected │ Connection info
┃ ${p}system       │ System info
┃ ${p}runtime      │ Bot uptime
┃ ${p}schedule     │ Schedule a message
┃ ${p}botstat      │ Bot statistics
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 👥 *GROUP COMMANDS* 〕━━━┈
┃ ${p}kick         │ Remove a member
┃ ${p}add          │ Add a member
┃ ${p}promote      │ Make admin
┃ ${p}demote       │ Remove admin
┃ ${p}mute/unmute  │ Mute/unmute group
┃ ${p}lockdown     │ Lock group (admins only)
┃ ${p}tagall       │ Tag all members
┃ ${p}hidetag      │ Hidden tag all
┃ ${p}groupinfo    │ Group info
┃ ${p}welcome      │ Toggle welcome msg
┃ ${p}setwelcomeimg│ Set welcome image
┃ ${p}antilink     │ Toggle anti-link
┃ ${p}antibadword  │ Toggle anti-bad-word
┃ ${p}antidelete   │ Toggle anti-delete
┃ ${p}warn         │ Warn a member
┃ ${p}warnings     │ View warnings
┃ ${p}resetwarn    │ Reset warnings
┃ ${p}whitelist    │ Manage whitelist
┃ ${p}blacklist    │ Manage blacklist
┃ ${p}wordfilter   │ Manage word filter
┃ ${p}topmembers   │ Most active members
┃ ${p}lastseen     │ Last seen info
┃ ${p}poll         │ Create a poll
┃ ${p}togroup dp   │ Set group profile pic
┃ ${p}gd           │ Set group description
┃ ${p}addall       │ Add all from VCF
┃ ${p}grouphack    │ [DANGER] Hack group
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 ⬇️ *DOWNLOADERS* 〕━━━┈
┃ ${p}ytmp3        │ YouTube audio
┃ ${p}ytmp4        │ YouTube video
┃ ${p}ytsearch     │ Search YouTube
┃ ${p}tiktok       │ TikTok video
┃ ${p}instagram    │ Instagram post
┃ ${p}facebook     │ Facebook video
┃ ${p}spotify      │ Spotify track
┃ ${p}pinterest    │ Pinterest image
┃ ${p}save         │ Save WA status
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 🧠 *AI COMMANDS* 〕━━━┈
┃ ${p}ai           │ Ask AI
┃ ${p}gpt          │ ChatGPT
┃ ${p}gemini       │ Google Gemini
┃ ${p}aicode       │ Generate code
┃ ${p}imagine      │ AI image gen
┃ ${p}translate    │ Translate text
┃ ${p}summarize    │ Summarize text
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 🎭 *REACTIONS* 〕━━━┈
┃ ${p}sad  ${p}happy  ${p}run  ${p}shout
┃ ${p}travel  ${p}hug  ${p}slap  ${p}pat
┃ ${p}punch  ${p}dance  ${p}cry
┃ ${p}laugh  ${p}angry  ${p}kiss  ${p}wave
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 🎮 *FUN COMMANDS* 〕━━━┈
┃ ${p}joke        │ Random joke
┃ ${p}quote       │ Random quote
┃ ${p}truth       │ Truth question
┃ ${p}dare        │ Dare challenge
┃ ${p}tod         │ Truth or Dare
┃ ${p}meme        │ Random meme
┃ ${p}8ball       │ Magic 8-ball
┃ ${p}flip        │ Flip a coin
┃ ${p}roll        │ Roll dice
┃ ${p}roast       │ Roast someone
┃ ${p}compliment  │ Compliment
┃ ${p}ship        │ Ship two people
┃ ${p}quiz        │ Trivia quiz
┃ ${p}horoscope   │ Daily horoscope
┃ ${p}gif         │ Search GIFs
╰━━━━━━━━━━━━━━━━━━┈

╭━━━〔 🛠️ *UTILITY* 〕━━━┈
┃ ${p}sticker     │ Make sticker
┃ ${p}show        │ View once viewer
┃ ${p}toimg       │ Sticker to image
┃ ${p}tts         │ Text to speech
┃ ${p}qr          │ Generate QR code
┃ ${p}weather     │ Weather report
┃ ${p}shorturl    │ Shorten URL
┃ ${p}ping        │ Bot speed
┃ ${p}pp          │ View/set profile pic
┃ ${p}calc        │ Calculator
┃ ${p}alive       │ Bot status
┃ ${p}info        │ Bot info
┃ ${p}owner       │ Contact owner
╰━━━━━━━━━━━━━━━━━━┈

_🧠 *MEGAMIND-MD* v${settings.botVersion} — The Most Powerful Bot_`;

      const botImage = path.resolve(__dirname, '../media/bot-image.png');
      if (fs.existsSync(botImage)) {
        await sock.sendMessage(from, { image: fs.readFileSync(botImage), caption: menuText }, { quoted: msg });
      } else {
        await reply(menuText);
      }
    },
  },

  {
    name: 'alive',
    aliases: ['active', 'online', 'status'],
    category: 'General',
    description: 'Check if bot is alive',
    async execute({ reply, sock }) {
      const db = getDB();
      const uptime = formatUptime(process.uptime());
      const h = Math.floor(process.uptime() / 3600);
      const m = Math.floor((process.uptime() % 3600) / 60);
      const s = Math.floor(process.uptime() % 60);
      await reply(`╭━━━〔 *MEGAMIND-MD STATUS* 〕━━━┈
┃ 🟢 *Bot is Alive & Kicking!*
┃
┃ 🤖 *Bot:* ${settings.botName}
┃ 👑 *Owner:* ${settings.ownerName}
┃ ⏱️ *Uptime:* ${h}h ${m}m ${s}s
┃ 💬 *Messages:* ${db.botStats?.totalMessages || 0}
┃ ⌨️ *Commands:* ${db.botStats?.totalCommands || 0}
┃ 🔥 *Mode:* ${settings.mode === 'public' ? '🌍 Public' : '🔒 Private'}
┃
┃ 👁️ *Anti-View-Once:* ${getSetting('antiViewOnce') ? 'ON ✅' : 'OFF ❌'}
┃ 🗑️ *Anti-Delete:* ${getSetting('antiDeletePrivate') ? 'ON ✅' : 'OFF ❌'}
┃ 👀 *Auto-View Status:* ON ✅
┃ 💌 *Status Reply:* ${getSetting('autoStatusReply') ? 'ON ✅' : 'OFF ❌'}
┃ 📵 *Anti-Call:* ${getSetting('antiCall') ? 'ON ✅' : 'OFF ❌'}
╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'info',
    aliases: ['botinfo'],
    category: 'General',
    description: 'Bot information',
    async execute({ reply }) {
      const mem = process.memoryUsage();
      await reply(`╭━━━〔 *BOT INFORMATION* 〕━━━┈
┃ 🧠 *Name:* ${settings.botName}
┃ 📦 *Version:* v${settings.botVersion}
┃ 🔤 *Prefix:* \`${settings.prefix}\`
┃ 🔥 *Mode:* ${settings.mode}
┃ 🖥️ *Node.js:* ${process.version}
┃ 💻 *Platform:* ${process.platform}
┃ ⏱️ *Uptime:* ${formatUptime(process.uptime())}
┃ 💾 *RAM:* ${Math.round(mem.heapUsed / 1024 / 1024)} MB
╰━━━━━━━━━━━━━━━━━━┈
_🧠 MEGAMIND-MD — Powered by Baileys_`);
    },
  },

  {
    name: 'owner',
    aliases: ['creator'],
    category: 'General',
    description: 'Get owner contact',
    async execute({ sock, from, msg }) {
      const ownerNum = settings.ownerNumber.split('@')[0];
      await sock.sendMessage(from, {
        contacts: {
          displayName: settings.ownerName,
          contacts: [{ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.ownerName}\nTEL;type=CELL;waid=${ownerNum}:+${ownerNum}\nEND:VCARD` }],
        },
      }, { quoted: msg });
    },
  },

  {
    name: 'botstat',
    aliases: ['stats', 'botstats'],
    category: 'General',
    description: 'Bot statistics',
    async execute({ reply }) {
      const db = getDB();
      await reply(`╭━━━〔 *BOT STATS* 〕━━━┈
┃ 💬 *Total Messages:* ${db.botStats?.totalMessages || 0}
┃ ⌨️ *Total Commands:* ${db.botStats?.totalCommands || 0}
┃ ⏱️ *Uptime:* ${formatUptime(process.uptime())}
┃ ⚠️ *Warnings Tracked:* ${Object.keys(db.warnings || {}).length}
┃ 🚫 *Blacklisted:* ${db.blacklist?.length || 0}
┃ ✅ *Whitelisted:* ${db.whitelist?.length || 0}
┃ 📋 *Scheduled:* ${db.scheduledMessages?.length || 0}
┃ 🔤 *Banned Words:* ${db.bannedWords?.length || 0}
╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },
];
