import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeedData } from './seed.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(directory, 'data');
const databaseFile = path.join(dataDirectory, 'dev-db.json');

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function persist(data) {
  ensureDataDirectory();
  data.meta.lastPersistedAt = new Date().toISOString();
  fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2), 'utf8');
}

function load() {
  ensureDataDirectory();
  if (!fs.existsSync(databaseFile)) {
    const data = createSeedData();
    persist(data);
    return data;
  }
  return JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
}

export const store = load();
export const saveStore = () => persist(store);

export function resetStore() {
  const fresh = createSeedData();
  Object.keys(store).forEach((key) => delete store[key]);
  Object.assign(store, fresh);
  saveStore();
  return store;
}
