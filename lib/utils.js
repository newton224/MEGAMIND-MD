const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const TEMP_DIR = path.resolve(__dirname, '../temp');

// ── Temp file helpers ─────────────────────────────────────────────────────────
async function cleanTemp() {
  const files = await fs.readdir(TEMP_DIR).catch(() => []);
  const now = Date.now();
  for (const f of files) {
    const fp = path.join(TEMP_DIR, f);
    try {
      const stat = await fs.stat(fp);
      if (now - stat.mtimeMs > 10 * 60 * 1000) await fs.remove(fp);
    } catch {}
  }
}

function tmpFile(ext) {
  return path.join(TEMP_DIR, `mm_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

// ── Download helper ───────────────────────────────────────────────────────────
async function downloadBuffer(url, headers = {}) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
    timeout: 30000,
    maxContentLength: 50 * 1024 * 1024,
  });
  return Buffer.from(res.data);
}

async function downloadFile(url, ext, headers = {}) {
  const buf = await downloadBuffer(url, headers);
  const fp = tmpFile(ext);
  await fs.writeFile(fp, buf);
  return fp;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return (bytes / 1024 ** 3).toFixed(1) + ' GB';
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// ── Message body extractor ────────────────────────────────────────────────────
function getBody(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

// ── Quoted message extractor ──────────────────────────────────────────────────
function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    key: { remoteJid: msg.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant },
    participant: ctx.participant,
  };
}

// ── Phone number helper ───────────────────────────────────────────────────────
function toJid(number) {
  return number.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

// ── Parse VCF contacts ────────────────────────────────────────────────────────
function parseVCF(content) {
  const numbers = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/TEL[^:]*:(.+)/i);
    if (match) {
      const num = match[1].trim().replace(/[^0-9]/g, '');
      if (num.length >= 7) numbers.push(num + '@s.whatsapp.net');
    }
  }
  return [...new Set(numbers)];
}

module.exports = { cleanTemp, tmpFile, downloadBuffer, downloadFile, formatBytes, formatDuration, formatUptime, getBody, getQuoted, toJid, parseVCF };
