const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { tmpFile, formatBytes, formatDuration } = require('../lib/utils');

// ── YouTube helpers ───────────────────────────────────────────────────────────
async function ytSearch(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
  const match = res.data.match(/var ytInitialData = (.+?);<\/script>/);
  if (!match) throw new Error('Could not fetch YouTube results');
  const data = JSON.parse(match[1]);
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
    ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
  const videos = contents
    .filter(i => i.videoRenderer)
    .slice(0, 5)
    .map(i => {
      const v = i.videoRenderer;
      return {
        title: v.title?.runs?.[0]?.text || 'Unknown',
        id: v.videoId,
        url: `https://youtube.com/watch?v=${v.videoId}`,
        duration: v.lengthText?.simpleText || 'N/A',
        channel: v.ownerText?.runs?.[0]?.text || 'Unknown',
        views: v.viewCountText?.simpleText || 'N/A',
        thumb: v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || '',
      };
    });
  return videos;
}

async function ytDownload(url, type = 'audio') {
  // Use cobalt.tools API (free, no key needed)
  const apiUrl = 'https://api.cobalt.tools/';
  const body = {
    url,
    downloadMode: type === 'audio' ? 'audio' : 'auto',
    audioFormat: 'mp3',
    videoQuality: '720',
  };
  const res = await axios.post(apiUrl, body, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    timeout: 30000,
  });
  const data = res.data;
  if (data.status === 'error') throw new Error(data.error?.code || 'Download failed');
  const downloadUrl = data.url || data.urls;
  if (!downloadUrl) throw new Error('No download URL returned');
  const buf = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data));
  return buf;
}

// ── TikTok downloader ─────────────────────────────────────────────────────────
async function tiktokDownload(url) {
  const api = `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const res = await axios.get(api, { timeout: 15000 });
  if (!res.data?.data) throw new Error('TikTok download failed');
  const data = res.data.data;
  const videoUrl = data.hdplay || data.play;
  const buf = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data));
  return { buffer: buf, title: data.title || 'TikTok Video', author: data.author?.nickname || 'Unknown' };
}

// ── Instagram downloader ──────────────────────────────────────────────────────
async function instagramDownload(url) {
  const api = `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`;
  // Use free alternative
  const res = await axios.get(`https://snapinsta.app/api`, {
    params: { url },
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000,
  }).catch(() => null);

  // Fallback: use igram
  const res2 = await axios.post('https://igram.world/api/convert', { url }, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000,
  }).catch(() => null);

  const data = res2?.data;
  if (!data?.url?.[0]?.url) throw new Error('Could not download Instagram media. Make sure the post is public.');
  const mediaUrl = data.url[0].url;
  const buf = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data));
  return { buffer: buf, type: data.url[0].type || 'video/mp4' };
}

// ── Facebook downloader ───────────────────────────────────────────────────────
async function facebookDownload(url) {
  const res = await axios.post('https://fdownloader.net/api/ajaxSearch', `q=${encodeURIComponent(url)}&lang=en`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000,
  });
  const html = res.data?.data || '';
  const match = html.match(/href="(https:\/\/[^"]+)"[^>]*>HD</);
  const match2 = html.match(/href="(https:\/\/[^"]+)"[^>]*>SD</);
  const dlUrl = (match || match2)?.[1];
  if (!dlUrl) throw new Error('Could not find Facebook video URL. Make sure it is a public video.');
  const buf = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r => Buffer.from(r.data));
  return buf;
}

module.exports = [
  {
    name: 'ytmp3',
    aliases: ['ytaudio', 'ymp3', 'song'],
    category: 'Downloader',
    description: 'Download YouTube audio as MP3',
    async execute({ sock, from, reply, msg, args, text }) {
      const query = text;
      if (!query) return reply('Usage: .ytmp3 <YouTube URL or search query>');

      await reply('⏳ Searching and downloading audio...');

      let url = query;
      if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
        const results = await ytSearch(query);
        if (!results.length) return reply('❌ No results found');
        url = results[0].url;
        await reply(`🎵 Found: *${results[0].title}*\n⏱ Duration: ${results[0].duration}`);
      }

      const buf = await ytDownload(url, 'audio');
      const title = url.includes('v=') ? url.split('v=')[1].split('&')[0] : 'audio';

      await sock.sendMessage(from, {
        audio: buf,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false,
      }, { quoted: msg });
    },
  },

  {
    name: 'ytmp4',
    aliases: ['ytvideo', 'ymp4', 'yt'],
    category: 'Downloader',
    description: 'Download YouTube video as MP4',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .ytmp4 <YouTube URL or search query>');

      await reply('⏳ Downloading video... (this may take a moment)');

      let url = text;
      if (!text.includes('youtube.com') && !text.includes('youtu.be')) {
        const results = await ytSearch(text);
        if (!results.length) return reply('❌ No results found');
        url = results[0].url;
        await reply(`🎬 Found: *${results[0].title}*\n⏱ Duration: ${results[0].duration}`);
      }

      const buf = await ytDownload(url, 'video');
      await sock.sendMessage(from, {
        video: buf,
        mimetype: 'video/mp4',
        caption: `🎬 Downloaded by MEGAMIND-MD`,
      }, { quoted: msg });
    },
  },

  {
    name: 'ytsearch',
    aliases: ['yts', 'searchyt'],
    category: 'Downloader',
    description: 'Search YouTube',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .ytsearch <query>');
      await reply('🔍 Searching YouTube...');
      const results = await ytSearch(text);
      if (!results.length) return reply('❌ No results found');
      const list = results.map((v, i) =>
        `${i + 1}. *${v.title}*\n   ⏱ ${v.duration} | 👤 ${v.channel}\n   🔗 ${v.url}`
      ).join('\n\n');
      await reply(`🎬 *YouTube Search Results:*\n\n${list}`);
    },
  },

  {
    name: 'tiktok',
    aliases: ['tt', 'tik'],
    category: 'Downloader',
    description: 'Download TikTok video',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .tiktok <TikTok URL>');
      if (!text.includes('tiktok.com')) return reply('Please provide a valid TikTok URL');
      await reply('⏳ Downloading TikTok video...');
      const { buffer, title, author } = await tiktokDownload(text);
      await sock.sendMessage(from, {
        video: buffer,
        mimetype: 'video/mp4',
        caption: `🎵 *${title}*\n👤 @${author}\n\n_Downloaded by MEGAMIND-MD_`,
      }, { quoted: msg });
    },
  },

  {
    name: 'instagram',
    aliases: ['ig', 'insta'],
    category: 'Downloader',
    description: 'Download Instagram photo/video',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .instagram <Instagram URL>');
      if (!text.includes('instagram.com')) return reply('Please provide a valid Instagram URL');
      await reply('⏳ Downloading Instagram media...');
      const { buffer, type } = await instagramDownload(text);
      const isVideo = type?.includes('video');
      await sock.sendMessage(from, {
        [isVideo ? 'video' : 'image']: buffer,
        mimetype: type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        caption: `📸 Downloaded by MEGAMIND-MD`,
      }, { quoted: msg });
    },
  },

  {
    name: 'facebook',
    aliases: ['fb', 'fbvideo'],
    category: 'Downloader',
    description: 'Download Facebook video',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .facebook <Facebook video URL>');
      await reply('⏳ Downloading Facebook video...');
      const buf = await facebookDownload(text);
      await sock.sendMessage(from, {
        video: buf,
        mimetype: 'video/mp4',
        caption: `📘 Downloaded by MEGAMIND-MD`,
      }, { quoted: msg });
    },
  },

  {
    name: 'spotify',
    aliases: ['spot', 'spo'],
    category: 'Downloader',
    description: 'Download Spotify track (search by name)',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .spotify <track name>\nNote: Searches YouTube for the track and downloads audio');
      await reply('🎵 Searching for Spotify track on YouTube...');
      const results = await ytSearch(text + ' lyrics');
      if (!results.length) return reply('❌ Track not found');
      const track = results[0];
      await reply(`🎵 Found: *${track.title}*\n⏱ ${track.duration}`);
      const buf = await ytDownload(track.url, 'audio');
      await sock.sendMessage(from, {
        audio: buf,
        mimetype: 'audio/mpeg',
        fileName: `${track.title}.mp3`,
      }, { quoted: msg });
    },
  },

  {
    name: 'pinterest',
    aliases: ['pin', 'pint'],
    category: 'Downloader',
    description: 'Download Pinterest image',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .pinterest <search query>');
      await reply('📌 Searching Pinterest...');

      const res = await axios.get(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(text)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
        timeout: 10000,
      });

      const matches = [...res.data.matchAll(/"url":"(https:\/\/i\.pinimg\.com\/[^"]+736x[^"]+\.jpg)"/g)];
      if (!matches.length) return reply('❌ No Pinterest images found for that query');

      const imgUrl = matches[Math.floor(Math.random() * Math.min(5, matches.length))][1];
      const buf = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 }).then(r => Buffer.from(r.data));
      await sock.sendMessage(from, {
        image: buf,
        caption: `📌 Pinterest: *${text}*\n_Downloaded by MEGAMIND-MD_`,
      }, { quoted: msg });
    },
  },

  {
    name: 'save',
    aliases: ['savestatus', 'status'],
    category: 'Downloader',
    description: 'Save a WhatsApp status (reply to a status view)',
    async execute({ sock, from, reply, msg, quoted }) {
      const target = quoted || msg;
      const m = target?.message;
      if (!m) return reply('Reply to a status or media message with .save');

      const imgMsg = m.imageMessage;
      const vidMsg = m.videoMessage;
      const audioMsg = m.audioMessage;

      if (!imgMsg && !vidMsg && !audioMsg) {
        return reply('Reply to an image, video, or audio message to save it');
      }

      const buffer = await sock.downloadMediaMessage(target);

      if (imgMsg) {
        await sock.sendMessage(from, { image: buffer, caption: '✅ Status saved!\n🧠 MEGAMIND-MD' }, { quoted: msg });
      } else if (vidMsg) {
        await sock.sendMessage(from, { video: buffer, caption: '✅ Status saved!\n🧠 MEGAMIND-MD', mimetype: 'video/mp4' }, { quoted: msg });
      } else if (audioMsg) {
        await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
      }
    },
  },
];
