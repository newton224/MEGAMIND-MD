const axios = require('axios');
const fs = require('fs-extra');
const { tmpFile, downloadBuffer } = require('../lib/utils');
const settings = require('../settings');

module.exports = [
  {
    name: 'ping',
    aliases: ['speed'],
    category: 'Utility',
    description: 'Check bot response speed',
    async execute({ reply }) {
      const start = Date.now();
      await reply('🏓 Pong!');
      const ms = Date.now() - start;
      await reply(`⚡ *Speed:* ${ms}ms\n🧠 MEGAMIND-MD is blazing fast!`);
    },
  },

  {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    category: 'Utility',
    description: 'Convert image/video to sticker',
    async execute({ sock, from, reply, msg, quoted }) {
      const target = quoted || msg;
      const m = target?.message;
      const imgMsg = m?.imageMessage;
      const vidMsg = m?.videoMessage;
      const stkMsg = m?.stickerMessage;

      if (!imgMsg && !vidMsg && !stkMsg) {
        return reply('Reply to an image or video to convert to sticker');
      }

      const buffer = await sock.downloadMediaMessage(target);
      const sharp = require('sharp');

      let webpBuf;
      if (imgMsg) {
        webpBuf = await sharp(buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toBuffer();
      } else {
        webpBuf = buffer;
      }

      await sock.sendMessage(from, {
        sticker: webpBuf,
        mimetype: 'image/webp',
      }, { quoted: msg });
    },
  },

  {
    name: 'toimg',
    aliases: ['toimage', 'stktoimg'],
    category: 'Utility',
    description: 'Convert sticker to image',
    async execute({ sock, from, reply, msg, quoted }) {
      const target = quoted || msg;
      const stkMsg = target?.message?.stickerMessage;
      if (!stkMsg) return reply('Reply to a sticker with .toimg');

      const buffer = await sock.downloadMediaMessage(target);
      const sharp = require('sharp');
      const pngBuf = await sharp(buffer).png().toBuffer();

      await sock.sendMessage(from, { image: pngBuf, caption: '🖼️ Sticker converted!' }, { quoted: msg });
    },
  },

  {
    name: 'show',
    aliases: ['vv', 'view', 'viewonce', 'antiviewonce'],
    category: 'Utility',
    description: 'View a view-once message',
    async execute({ sock, from, reply, msg, quoted }) {
      const target = quoted || msg;
      const m = target?.message;

      const voImg = m?.viewOnceMessageV2?.message?.imageMessage || m?.viewOnceMessage?.message?.imageMessage;
      const voVid = m?.viewOnceMessageV2?.message?.videoMessage || m?.viewOnceMessage?.message?.videoMessage;

      if (!voImg && !voVid) {
        return reply('Reply to a view-once message with .show to reveal it');
      }

      const innerMsg = { message: m?.viewOnceMessageV2?.message || m?.viewOnceMessage?.message, key: target.key };
      const buffer = await sock.downloadMediaMessage(innerMsg);

      if (voImg) {
        await sock.sendMessage(from, { image: buffer, caption: '👁️ View Once revealed by MEGAMIND-MD' }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { video: buffer, caption: '👁️ View Once revealed by MEGAMIND-MD', mimetype: 'video/mp4' }, { quoted: msg });
      }
    },
  },

  {
    name: 'pp',
    aliases: ['setpp', 'profilepic', 'dp'],
    category: 'Utility',
    description: 'Set your profile picture (private chat only)',
    async execute({ sock, reply, msg, quoted, sender }) {
      const target = quoted || msg;
      const imgMsg = target?.message?.imageMessage || msg.message?.imageMessage;
      if (!imgMsg) return reply('Reply to an image with .pp to set it as your profile picture');
      const buffer = await sock.downloadMediaMessage(target);
      await sock.updateProfilePicture(sender, buffer);
      await reply('✅ Profile picture updated!');
    },
  },

  {
    name: 'tts',
    aliases: ['texttospeech', 'speak'],
    category: 'Utility',
    description: 'Convert text to speech',
    async execute({ sock, from, reply, msg, text, args }) {
      if (!text) return reply('Usage: .tts <text> [lang]\nExample: .tts Hello World en');
      const lang = args[args.length - 1].length === 2 ? args.pop() : 'en';
      const phrase = args.join(' ') || text;

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(phrase)}&tl=${lang}&client=tw-ob`;
      const buf = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => Buffer.from(r.data));

      await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
    },
  },

  {
    name: 'qr',
    aliases: ['qrcode'],
    category: 'Utility',
    description: 'Generate a QR code',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .qr <text or URL>');
      const qrcode = require('qrcode');
      const buf = await qrcode.toBuffer(text, { width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      await sock.sendMessage(from, { image: buf, caption: `📱 QR Code for:\n${text}` }, { quoted: msg });
    },
  },

  {
    name: 'weather',
    aliases: ['forecast', 'temp'],
    category: 'Utility',
    description: 'Get weather for a city',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .weather <city>');
      const apiKey = settings.apiKeys.weather;
      if (!apiKey) return reply('❌ WEATHER_API_KEY not set. Get a free key at openweathermap.org');

      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(text)}&appid=${apiKey}&units=metric`, { timeout: 8000 });
      const d = res.data;
      await reply(`🌤️ *Weather in ${d.name}, ${d.sys.country}*

🌡️ *Temp:* ${d.main.temp}°C (feels like ${d.main.feels_like}°C)
💧 *Humidity:* ${d.main.humidity}%
💨 *Wind:* ${d.wind.speed} m/s
☁️ *Condition:* ${d.weather[0].description}
👁️ *Visibility:* ${d.visibility / 1000} km

🧠 MEGAMIND-MD Weather`);
    },
  },

  {
    name: 'shorturl',
    aliases: ['shorten', 'short'],
    category: 'Utility',
    description: 'Shorten a URL',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .shorturl <URL>');
      const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`, { timeout: 8000 });
      await reply(`🔗 *Short URL:*\n${res.data}\n\n_Original:_ ${text}`);
    },
  },

  {
    name: 'translate',
    aliases: ['tr', 'trans'],
    category: 'Utility',
    description: 'Translate text',
    async execute({ reply, args, text }) {
      if (!args.length) return reply('Usage: .translate <lang> <text>\nExample: .translate es Hello World');
      const to = args[0];
      const phrase = args.slice(1).join(' ');
      if (!phrase) return reply('Please provide text to translate');

      const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(phrase)}`, { timeout: 8000 });
      const translated = res.data[0].map(s => s[0]).join('');
      await reply(`🌐 *Translation (→ ${to}):*\n${translated}`);
    },
  },

  {
    name: 'ping',
    aliases: [],
    category: 'Utility',
    description: 'Ping the bot',
    async execute({ reply }) {
      const start = Date.now();
      const r = await reply('🏓 Measuring...');
      await reply(`⚡ Pong! Response time: *${Date.now() - start}ms*`);
    },
  },
];
