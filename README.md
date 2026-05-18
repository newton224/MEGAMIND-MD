<div align="center">

# 🧠 MEGAMIND-MD

**The Most Powerful WhatsApp Multi-Device Bot**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Baileys](https://img.shields.io/badge/Powered%20by-Baileys-blue?style=flat-square)](https://github.com/WhiskeySockets/Baileys)

</div>

---

## ⚡ Quick Deploy (3 Steps)

### Step 1 — Get Your SESSION ID

> Visit the pairing server and connect your WhatsApp:
> **👉 [MEGAMIND-MD Pairing Site](https://your-pairing-site.onrender.com)**

1. Visit the link — **each person gets their own unique session** (safe to share!)
2. Choose **QR Code** or **Pairing Code**
3. Connect your WhatsApp account
4. **Copy the SESSION ID** shown

---

### Step 2 — Configure .env

```env
SESSION_ID=MEGAMIND~xxxxxxxxxxxxxxxx
OWNER_NUMBER=2348012345678
OWNER_NAME=Your Name
BOT_NAME=MEGAMIND-MD
BOT_MODE=public
PREFIX=.
```

---

### Step 3 — Deploy

#### 🌐 bothosting.net / Katabam
1. Upload the ZIP to the dashboard
2. Start command: `node index.js`
3. Add your env variables
4. Deploy ✅

#### 🚀 Render.com
1. Push to GitHub → New Web Service
2. Build: `npm install` | Start: `node index.js`
3. Add env vars | Add Disk at `/app/session`

#### 🚂 Railway
1. New Project → Deploy from GitHub
2. Add env vars | Add Volume at `/app/session`

#### 💻 VPS / Linux
```bash
git clone https://github.com/MEGAMIND-MD/MEGAMIND-MD
cd MEGAMIND-MD
npm install
cp .env.example .env
nano .env   # fill in your details
node index.js
# or with pm2:
pm2 start index.js --name megamind-md
```

---

## ✨ Commands

| Category | Commands |
|---|---|
| 👑 Owner | restart, shutdown, broadcast, ban/unban, block/unblock, setppbot, setbio, autoread, anticall, botmode, join, leave, repo, pairsite, botconnected, runtime, system |
| 👥 Group | kick, add, promote, demote, mute/unmute, tagall, hidetag, groupinfo, welcome, antilink, antibadword, antidelete, togroup dp, gd, addall, grouphack |
| ⬇️ Downloader | ytmp3, ytmp4, ytsearch, tiktok, instagram, facebook, spotify, pinterest, save |
| 🧠 AI | ai, gpt, gemini, aicode, imagine, translate, summarize |
| 🎭 Reactions | sad, happy, run, shout, travel, hug, slap, pat, punch, dance, cry, laugh, angry, kiss, wink, wave |
| 🎮 Fun | joke, quote, truth, dare, tod, meme, 8ball, flip, roll, roast, compliment, ship |
| 🛠️ Utility | sticker, show (view once viewer), toimg, tts, qr, weather, shorturl, ping, pp, system, runtime |
| 📌 General | menu, alive, info, owner |

---

## 🔑 Pairing Site Fix

**Problem solved:** Previously, sharing the pairing link would show another person your already-generated session.

**How it works now:**
- Every visitor gets their **own unique WebSocket connection** (via socket.id)
- Each connection creates an **isolated WhatsApp session** in a temp folder
- When you close the tab, we clean up the temp files **without logging out your WhatsApp** — so your SESSION_ID stays valid
- Sharing the link is now **completely safe** — each person gets their own fresh pairing flow

---

## 📁 Project Structure

```
MEGAMIND-MD/
├── index.js          ← Main bot entry point
├── pair.js           ← Pairing server (deploy separately)
├── settings.js       ← Configuration
├── package.json
├── .env.example      ← Copy to .env
├── Dockerfile        ← Docker for bot
├── Dockerfile.pairing← Docker for pairing site
├── render.yaml       ← Render.com config
├── Procfile          ← Heroku/Katabam config
├── lib/
│   ├── connection.js    ← WhatsApp connection + auto-reconnect
│   ├── handler.js       ← Command routing + permission checks
│   ├── pluginLoader.js  ← Auto-loads plugins
│   ├── database.js      ← JSON database
│   ├── logger.js        ← Pino logger
│   ├── qrServer.js      ← Web dashboard
│   ├── sessionManager.js← Session encode/restore
│   └── utils.js         ← Utilities
└── plugins/
    ├── menu.js          ← Menu + general commands
    ├── owner.js         ← Owner-only commands
    ├── group.js         ← Group management
    ├── downloader.js    ← Media downloaders
    ├── ai.js            ← AI commands
    ├── fun.js           ← Fun & games
    ├── utility.js       ← Utility tools
    └── reactions.js     ← Animated GIF reactions
```

---

## ⚙️ Environment Variables

| Variable | Description | Required |
|---|---|---|
| `SESSION_ID` | From the pairing site | ✅ |
| `OWNER_NUMBER` | Your WhatsApp number (no +) | ✅ |
| `OWNER_NAME` | Your display name | ✅ |
| `BOT_NAME` | Bot name | ✅ |
| `BOT_MODE` | `public` or `private` | ✅ |
| `PREFIX` | Command prefix (default `.`) | ✅ |
| `OPENAI_API_KEY` | ChatGPT + DALL-E | Optional |
| `GEMINI_API_KEY` | Google Gemini | Optional |
| `GROQ_API_KEY` | Groq (fast, free) | Optional |
| `WEATHER_API_KEY` | Weather commands | Optional |
| `UPTIME_URL` | Self-ping URL | Optional |
| `PAIR_SITE_URL` | Pairing site URL | Optional |
| `ANTI_CALL` | Reject all calls (`true`/`false`) | Optional |

---

## 🔌 Plugin System

Drop any `.js` file in `plugins/` — auto-loaded on start:

```js
module.exports = {
  name: 'hello',
  aliases: ['hi'],
  category: 'General',
  description: 'Say hello',
  ownerOnly: false,
  groupOnly: false,
  adminOnly: false,
  botAdmin: false,
  async execute({ reply, senderPhone }) {
    await reply(`👋 Hello, ${senderPhone}!`);
  },
};
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| Bot not connecting | Check SESSION_ID — get a fresh one from the pairing site |
| Commands not working | Check PREFIX in .env matches what you type |
| Downloads failing | Ensure the URL is public and accessible |
| AI not responding | Add OPENAI_API_KEY or GEMINI_API_KEY |
| Bot keeps disconnecting | Set UPTIME_URL for self-ping |
| Not working on bothosting.net | Use `node index.js` as start command, add all .env vars |

---

<div align="center">
Made with ❤️ | 🧠 MEGAMIND-MD | The Most Powerful WhatsApp Bot
</div>
