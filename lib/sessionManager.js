const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

const SESSION_DIR = path.resolve(__dirname, '../session');
const PREFIX = 'MEGAMIND~';

/**
 * If SESSION_ID env var is set, decode and restore creds into the session folder.
 */
async function restoreSession(sessionId) {
  if (!sessionId || !sessionId.startsWith(PREFIX)) return false;
  try {
    const encoded = sessionId.slice(PREFIX.length);
    const creds = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    await fs.ensureDir(SESSION_DIR);
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) {
      await fs.writeJson(credsPath, creds, { spaces: 2 });
      logger.info('Session restored from SESSION_ID');
    }
    return true;
  } catch (err) {
    logger.error({ err }, 'Failed to restore session from SESSION_ID');
    return false;
  }
}

/**
 * Encode a creds.json into a SESSION_ID string.
 */
async function encodeSession(credsPath) {
  const creds = await fs.readJson(credsPath);
  return PREFIX + Buffer.from(JSON.stringify(creds)).toString('base64');
}

module.exports = { restoreSession, encodeSession, SESSION_DIR };
