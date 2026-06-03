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

export function migrateStoreData(data) {
  const seed = createSeedData();
  let changed = false;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { data: seed, changed: true };
  }

  for (const [key, value] of Object.entries(seed)) {
    if (data[key] === undefined || data[key] === null) {
      data[key] = value;
      changed = true;
    }
  }

  const previousVersion = Number(data.meta?.version || 0);
  if (previousVersion < seed.meta.version) {
    data.meta = { ...seed.meta, ...(data.meta || {}), version: seed.meta.version };
    data.energyOverview = { ...seed.energyOverview, ...(data.energyOverview || {}) };
    data.simulator = { ...seed.simulator, ...(data.simulator || {}) };
    changed = true;
  }

  return { data, changed };
}

function load() {
  ensureDataDirectory();
  if (!fs.existsSync(databaseFile)) {
    const data = createSeedData();
    persist(data);
    return data;
  }
  const loaded = JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
  const migrated = migrateStoreData(loaded);
  if (migrated.changed) persist(migrated.data);
  return migrated.data;
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
