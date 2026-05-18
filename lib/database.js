const fs = require('fs-extra');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database/db.json');

let db = {
  groups: {},
  users: {},
  settings: {},
  stats: {},
  warnings: {},
  blacklist: [],
  whitelist: [],
  msgActivity: {},
  botStats: { totalMessages: 0, totalCommands: 0 },
  scheduledMessages: [],
  bannedWords: [],
  broadcastList: [],
};

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const loaded = fs.readJsonSync(DB_PATH);
      // Merge to ensure new fields exist
      db = {
        groups: loaded.groups || {},
        users: loaded.users || {},
        settings: loaded.settings || {},
        stats: loaded.stats || {},
        warnings: loaded.warnings || {},
        blacklist: loaded.blacklist || [],
        whitelist: loaded.whitelist || [],
        msgActivity: loaded.msgActivity || {},
        botStats: loaded.botStats || { totalMessages: 0, totalCommands: 0 },
        scheduledMessages: loaded.scheduledMessages || [],
        bannedWords: loaded.bannedWords || [],
        broadcastList: loaded.broadcastList || [],
      };
    } else {
      fs.ensureDirSync(path.dirname(DB_PATH));
      fs.writeJsonSync(DB_PATH, db, { spaces: 2 });
    }
  } catch { db = { groups: {}, users: {}, settings: {}, stats: {}, warnings: {}, blacklist: [], whitelist: [], msgActivity: {}, botStats: { totalMessages: 0, totalCommands: 0 }, scheduledMessages: [], bannedWords: [], broadcastList: [] }; }
}

function saveDB() {
  try { fs.writeJsonSync(DB_PATH, db, { spaces: 2 }); } catch {}
}

loadDB();

// ── Groups ────────────────────────────────────────────────────────────────────
function getGroup(jid) {
  if (!db.groups[jid]) db.groups[jid] = {};
  return db.groups[jid];
}
function setGroup(jid, data) {
  db.groups[jid] = { ...(db.groups[jid] || {}), ...data };
  saveDB();
}

// ── Users ─────────────────────────────────────────────────────────────────────
function getUser(jid) {
  if (!db.users[jid]) db.users[jid] = { banned: false, warns: 0 };
  return db.users[jid];
}
function setUser(jid, data) {
  db.users[jid] = { ...(db.users[jid] || {}), ...data };
  saveDB();
}

// ── Global settings ───────────────────────────────────────────────────────────
function getSetting(key) { return db.settings[key]; }
function setSetting(key, val) { db.settings[key] = val; saveDB(); }

// ── Stats ─────────────────────────────────────────────────────────────────────
function incrementStat(key) { db.stats[key] = (db.stats[key] || 0) + 1; saveDB(); }
function getStats() { return db.stats; }

// ── Warnings ──────────────────────────────────────────────────────────────────
function getWarnings(groupJid, userJid) {
  const key = `${groupJid}|${userJid}`;
  return db.warnings[key] || { count: 0, reasons: [] };
}
function addWarning(groupJid, userJid, reason) {
  const key = `${groupJid}|${userJid}`;
  if (!db.warnings[key]) db.warnings[key] = { count: 0, reasons: [] };
  db.warnings[key].count++;
  db.warnings[key].reasons.push(reason || 'No reason given');
  saveDB();
  return db.warnings[key];
}
function resetWarnings(groupJid, userJid) {
  const key = `${groupJid}|${userJid}`;
  delete db.warnings[key];
  saveDB();
}

// ── Blacklist / Whitelist ─────────────────────────────────────────────────────
function addToBlacklist(jid) { if (!db.blacklist.includes(jid)) { db.blacklist.push(jid); saveDB(); } }
function removeFromBlacklist(jid) { db.blacklist = db.blacklist.filter(j => j !== jid); saveDB(); }
function addToWhitelist(jid) { if (!db.whitelist.includes(jid)) { db.whitelist.push(jid); saveDB(); } }
function removeFromWhitelist(jid) { db.whitelist = db.whitelist.filter(j => j !== jid); saveDB(); }

// ── Banned words ──────────────────────────────────────────────────────────────
function addBannedWord(word) { if (!db.bannedWords.includes(word.toLowerCase())) { db.bannedWords.push(word.toLowerCase()); saveDB(); } }
function removeBannedWord(word) { db.bannedWords = db.bannedWords.filter(w => w !== word.toLowerCase()); saveDB(); }

// ── Scheduled messages ────────────────────────────────────────────────────────
function setScheduledMessages(list) { db.scheduledMessages = list; saveDB(); }

// ── Broadcast list ────────────────────────────────────────────────────────────
function getBroadcastList() { return db.broadcastList || []; }
function setBroadcastList(list) { db.broadcastList = list; saveDB(); }

// ── Raw DB access ─────────────────────────────────────────────────────────────
function getDB() { return db; }

module.exports = {
  getGroup, setGroup, getUser, setUser,
  getSetting, setSetting,
  incrementStat, getStats,
  getWarnings, addWarning, resetWarnings,
  addToBlacklist, removeFromBlacklist,
  addToWhitelist, removeFromWhitelist,
  addBannedWord, removeBannedWord,
  setScheduledMessages, getBroadcastList, setBroadcastList,
  getDB, saveDB,
};
