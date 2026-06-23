import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { createSeedData } from './seed.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.TWINPARK_DATA_DIR || path.join(directory, 'data');
const databaseFile = path.join(dataDirectory, 'dev-db.json');
const storageDriver = (process.env.TWINPARK_STORAGE || 'json').toLowerCase();
const useMysql = storageDriver === 'mysql';
const mysqlStoreId = process.env.MYSQL_STORE_ID || 'main';
const mysqlConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'twinparkos',
  charset: 'utf8mb4',
  timezone: 'Z',
  multipleStatements: false
};
let mysqlPool;

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function persistJson(data) {
  ensureDataDirectory();
  data.meta.lastPersistedAt = new Date().toISOString();
  fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2), 'utf8');
}

async function ensureMysqlStore() {
  const bootstrapConnection = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    charset: mysqlConfig.charset,
    timezone: mysqlConfig.timezone
  });
  try {
    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrapConnection.end();
  }

  mysqlPool ||= mysql.createPool({
    ...mysqlConfig,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
    queueLimit: 0
  });
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS app_store (
      id VARCHAR(64) PRIMARY KEY,
      data LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function loadJsonFileOrSeed() {
  if (!fs.existsSync(databaseFile)) return createSeedData();
  return JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
}

async function persistMysql(data) {
  await ensureMysqlStore();
  data.meta.lastPersistedAt = new Date().toISOString();
  await mysqlPool.query(
    `INSERT INTO app_store (id, data, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
    [mysqlStoreId, JSON.stringify(data)]
  );
}

async function persist(data) {
  if (useMysql) return persistMysql(data);
  persistJson(data);
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

async function loadJsonStore() {
  ensureDataDirectory();
  if (!fs.existsSync(databaseFile)) {
    const data = createSeedData();
    persistJson(data);
    return data;
  }
  const loaded = JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
  const migrated = migrateStoreData(loaded);
  if (migrated.changed) persistJson(migrated.data);
  return migrated.data;
}

async function loadMysqlStore() {
  await ensureMysqlStore();
  const [rows] = await mysqlPool.query('SELECT data FROM app_store WHERE id = ? LIMIT 1', [mysqlStoreId]);
  if (!rows.length) {
    const migrated = migrateStoreData(loadJsonFileOrSeed());
    await persistMysql(migrated.data);
    return migrated.data;
  }
  const loaded = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
  const migrated = migrateStoreData(loaded);
  if (migrated.changed) await persistMysql(migrated.data);
  return migrated.data;
}

async function load() {
  if (useMysql) return loadMysqlStore();
  return loadJsonStore();
}

export const store = await load();
export const saveStore = () => persist(store);

export async function resetStore() {
  const fresh = createSeedData();
  Object.keys(store).forEach((key) => delete store[key]);
  Object.assign(store, fresh);
  await saveStore();
  return store;
}
