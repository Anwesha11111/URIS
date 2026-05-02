'use strict';

/**
 * configStore.js — lightweight JSON file-based config store.
 * Persists key/value settings to .kiro-config.json in the project root.
 * Used for admin-configurable settings like the availability deadline.
 */

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../.kiro-config.json');

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function get(key, defaultValue = null) {
  return readConfig()[key] ?? defaultValue;
}

function set(key, value) {
  const config = readConfig();
  config[key] = value;
  writeConfig(config);
}

module.exports = { get, set };
