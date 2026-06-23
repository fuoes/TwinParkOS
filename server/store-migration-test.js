import assert from 'node:assert/strict';

process.env.TWINPARK_STORAGE = 'json';
const { migrateStoreData } = await import('./store.js');

const legacy = {
  meta: {
    version: 1,
    parkName: '科创产业园',
    lastPersistedAt: '2026-06-01T00:00:00.000Z'
  },
  devices: [{ id: 'DEV-LEGACY-001', name: '旧版设备' }],
  energyOverview: {
    electricityToday: 100
  }
};

const migrated = migrateStoreData(legacy);

assert.equal(migrated.changed, true);
assert.equal(migrated.data.meta.version, 2);
assert.equal(migrated.data.devices[0].id, 'DEV-LEGACY-001');
assert.equal(migrated.data.energyOverview.electricityToday, 100);
assert.equal(typeof migrated.data.energyOverview.waterToday, 'number');
assert.equal(migrated.data.simulator.enabled, true);
assert.equal(migrated.data.simulator.speed, 1);
assert.ok(Array.isArray(migrated.data.alarmRules));
assert.ok(Array.isArray(migrated.data.auditLogs));

console.log(JSON.stringify({
  status: 'ok',
  migratedFrom: 1,
  migratedTo: migrated.data.meta.version,
  simulator: migrated.data.simulator,
  addedCollections: ['alarmRules', 'auditLogs']
}, null, 2));
