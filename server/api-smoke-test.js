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

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const token = login.token;

const health = await request('/api/health');
const bootstrap = await request('/api/bootstrap', {}, token);

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

await request(`/api/resources/enterprises/${created.item.id}`, { method: 'DELETE' }, token);
await request(`/api/devices/${bootstrap.devices[0].id}/control`, {
  method: 'POST',
  body: JSON.stringify({ action: 'recover' })
}, token);

console.log(JSON.stringify({
  health: health.status,
  user: login.user.name,
  resources: Object.keys(bootstrap).length,
  deviceStatus: controlled.item.status,
  scenario: scenario.item.name,
  reportBytes: report.length
}, null, 2));
