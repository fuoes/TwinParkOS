import assert from 'node:assert/strict';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

async function request(path, options = {}, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${payload.message || payload}`);
  return payload;
}

async function expectFailure(path, options, token, status) {
  try {
    await request(path, options, token);
    throw new Error(`${options.method || 'GET'} ${path}: expected ${status}`);
  } catch (error) {
    if (!error.message.includes(`: ${status} `)) throw error;
  }
}

await expectFailure('/api/bootstrap', {}, undefined, 401);

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const token = login.token;
const engineerLogin = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'engineer', password: 'engineer123' })
});
const engineerToken = engineerLogin.token;

const health = await request('/api/health');
const bootstrap = await request('/api/bootstrap', {}, token);
await expectFailure('/api/users', {}, engineerToken, 403);

const created = await request('/api/resources/enterprises', {
  method: 'POST',
  body: JSON.stringify({
    name: '接口测试企业',
    industry: '软件服务',
    building: 'A1',
    rooms: '901',
    area: 300,
    status: '在驻',
    bill: '正常'
  })
}, token);

const retained = await request('/api/resources/enterprises', {
  method: 'POST',
  body: JSON.stringify({
    name: '接口测试保留企业',
    industry: '软件服务',
    building: 'A1',
    rooms: '902',
    area: 180,
    status: '在驻',
    bill: '正常'
  })
}, token);

await request(`/api/resources/enterprises/${created.item.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: '即将到期' })
}, token);

const controlled = await request(`/api/devices/${bootstrap.devices[0].id}/control`, {
  method: 'POST',
  body: JSON.stringify({ action: 'stop' })
}, token);

const scenario = await request('/api/simulator/scenarios/energy-spike', { method: 'POST', body: '{}' }, token);
const report = await request('/api/reports/devices/export', {}, token);
const engineerOrder = await request('/api/workorders', {
  method: 'POST',
  body: JSON.stringify({ title: '接口边界测试工单', type: '设备故障', location: '测试区域' })
}, engineerToken);
await expectFailure(`/api/workorders/${engineerOrder.item.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: '已完成' })
}, engineerToken, 400);

await request(`/api/resources/enterprises/${created.item.id}`, { method: 'DELETE' }, token);
const afterDelete = await request('/api/resources/enterprises', {
  method: 'POST',
  body: JSON.stringify({
    name: '接口测试重建企业',
    industry: '软件服务',
    building: 'A1',
    rooms: '903',
    area: 160,
    status: '在驻',
    bill: '正常'
  })
}, token);
assert.notEqual(afterDelete.item.id, retained.item.id, '删除后新建资源不应复用仍在使用的 ID');
await request(`/api/resources/enterprises/${retained.item.id}`, { method: 'DELETE' }, token);
await request(`/api/resources/enterprises/${afterDelete.item.id}`, { method: 'DELETE' }, token);
await request(`/api/devices/${bootstrap.devices[0].id}/control`, {
  method: 'POST',
  body: JSON.stringify({ action: 'recover' })
}, token);
await request('/api/system/reset-demo', { method: 'POST', body: '{}' }, token);

console.log(JSON.stringify({
  health: health.status,
  user: login.user.name,
  engineer: engineerLogin.user.name,
  resources: Object.keys(bootstrap).length,
  deviceStatus: controlled.item.status,
  scenario: scenario.item.name,
  reportBytes: report.length,
  boundaries: ['unauthenticated', 'role-permission', 'workorder-transition', 'resource-id-uniqueness']
}, null, 2));
