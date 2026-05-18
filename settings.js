// ╔══════════════════════════════════════════════╗
// ║         MEGAMIND-MD BOT SETTINGS             ║
// ║   All settings read from .env file           ║
// ╚══════════════════════════════════════════════╝

module.exports = {
  // ─── Bot Identity ────────────────────────────
  botName:    process.env.BOT_NAME    || 'MEGAMIND-MD',
  botVersion: '3.0.0',
  botImage:   './media/bot-image.png',

  // ─── Owner Config ────────────────────────────
  ownerNumber: (process.env.OWNER_NUMBER || '254712345678').replace(/[^0-9]/g, '') + '@s.whatsapp.net',
  ownerName:   process.env.OWNER_NAME   || 'MEGAMIND Owner',

  // ─── Prefix ──────────────────────────────────
  prefix: process.env.PREFIX || '.',

  // ─── Bot Mode ────────────────────────────────
  // 'public'  — anyone can use the bot
  // 'private' — only owner can use the bot
  mode: process.env.BOT_MODE || 'public',

  // ─── Auto Features ───────────────────────────
  autoRead:       process.env.AUTO_READ      === 'true',
  autoTyping:     process.env.AUTO_TYPING    !== 'false',
  autoRecording:  false,
  autoViewStatus: process.env.AUTO_VIEW_STATUS !== 'false', // enabled by default

  // ─── Session ─────────────────────────────────
  sessionId:   process.env.SESSION_ID   || '',
  sessionDir:  './session',
  sessionName: process.env.SESSION_NAME || 'megamind-session',

  // ─── Database ────────────────────────────────
  dbPath: './database/db.json',

  // ─── Anti-Features ───────────────────────────
  antiCrash:   true,
  antiSpam:    true,
  antiCall:    process.env.ANTI_CALL    === 'true',
  antiLink:    false,
  antiBadWord: false,
  antiDelete:  false,

  // ─── Rate Limiting ───────────────────────────
  spamInterval: 5000,
  maxSpamCount: 5,

  // ─── Welcome / Goodbye ───────────────────────
  welcomeMessage: process.env.WELCOME_MSG || '🎉 Welcome to *{group}*, {user}!\n\n🧠 Powered by MEGAMIND-MD',
  goodbyeMessage: process.env.GOODBYE_MSG || '👋 Goodbye, {user}. We will miss you in *{group}*!',

  // ─── Theme Emojis ────────────────────────────
  emoji: {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', loading: '⏳',
    brain: '🧠', robot: '🤖', star: '⭐', crown: '👑', fire: '🔥',
    lightning: '⚡', shield: '🛡️', music: '🎵', video: '🎬', image: '🖼️',
  },

  // ─── API Keys ─────────────────────────────────
  apiKeys: {
    openai:      process.env.OPENAI_API_KEY  || '',
    gemini:      process.env.GEMINI_API_KEY  || '',
    weather:     process.env.WEATHER_API_KEY || '',
    shortUrl:    process.env.SHORT_URL_API   || '',
    spotify:     process.env.SPOTIFY_API     || '',
    huggingface: process.env.HUGGINGFACE_API || '',
    groq:        process.env.GROQ_API_KEY    || '',
  },

  // ─── Server / Uptime ─────────────────────────
  port:      parseInt(process.env.PORT || '3000'),
  uptimeUrl: process.env.UPTIME_URL || '',

  // ─── Logging ─────────────────────────────────
  logLevel: process.env.LOG_LEVEL || 'info',

  // ─── Branding ────────────────────────────────
  footer: '🧠 MEGAMIND-MD | The Most Powerful WhatsApp Bot',
  pairSiteUrl: process.env.PAIR_SITE_URL || '',
};
