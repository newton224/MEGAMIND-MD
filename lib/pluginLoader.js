const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

const commands = new Map();
const aliases = new Map();

function register(cmd) {
  commands.set(cmd.name.toLowerCase(), cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
    }
  }
}

function getCommand(name) {
  const key = name.toLowerCase();
  if (commands.has(key)) return commands.get(key);
  if (aliases.has(key)) return commands.get(aliases.get(key));
  return null;
}

function listCommands() {
  return [...commands.values()];
}

async function loadPlugins() {
  const dirs = [
    path.resolve(__dirname, '../plugins'),
    path.resolve(__dirname, '../commands'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const mod = require(path.join(dir, file));
        if (Array.isArray(mod)) {
          mod.forEach(register);
        } else if (mod?.name) {
          register(mod);
        }
        logger.debug(`Loaded: ${file}`);
      } catch (err) {
        logger.error({ err }, `Failed to load plugin: ${file}`);
      }
    }
  }

  logger.info(`Loaded ${commands.size} commands (${aliases.size} aliases)`);
}

module.exports = { loadPlugins, getCommand, listCommands, register };
