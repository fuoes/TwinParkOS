const TOKEN_KEY = 'twinpark-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(payload.message || '请求失败');
  }
  return payload;
}

export async function listResource(resource) {
  return request(`/api/resources/${resource}`);
}

export async function createResource(resource, data) {
  return request(`/api/resources/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateResource(resource, id, data) {
  return request(`/api/resources/${resource}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteResource(resource, id) {
  return request(`/api/resources/${resource}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function login(username, password) {
  const payload = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  localStorage.setItem(TOKEN_KEY, payload.token);
  return payload.user;
}

export async function getMe() {
  const payload = await request('/api/auth/me');
  return payload.user;
}

export async function getBootstrap() {
  return request('/api/bootstrap');
}

export async function simulateAlarm() {
  return request('/api/simulator/alarms', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function acknowledgeAlarm(alarmId) {
  return request(`/api/alarms/${alarmId}/acknowledge`, { method: 'POST' });
}

export async function createAlarmWorkorder(alarmId) {
  return request(`/api/alarms/${alarmId}/workorders`, { method: 'POST' });
}

export async function closeAlarm(alarmId, result = '已核查并关闭') {
  return request(`/api/alarms/${alarmId}/close`, {
    method: 'POST',
    body: JSON.stringify({ result })
  });
}

export async function controlDevice(deviceId, action, reason) {
  return request(`/api/devices/${encodeURIComponent(deviceId)}/control`, {
    method: 'POST',
    body: JSON.stringify({ action, reason })
  });
}

export async function createWorkorder(data) {
  return request('/api/workorders', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateWorkorder(orderId, data) {
  return request(`/api/workorders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function createUser(data) {
  return request('/api/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id, data) {
  return request(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteUser(id) {
  return request(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createRole(data) {
  return request('/api/roles', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateRole(id, data) {
  return request(`/api/roles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteRole(id) {
  return request(`/api/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateSimulator(data) {
  return request('/api/simulator/status', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function runScenario(scenario) {
  return request(`/api/simulator/scenarios/${encodeURIComponent(scenario)}`, { method: 'POST', body: '{}' });
}

export async function resetDemo() {
  return request('/api/system/reset-demo', { method: 'POST', body: '{}' });
}

export async function downloadReport(type) {
  const token = getToken();
  const response = await fetch(`/api/reports/${encodeURIComponent(type)}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || '报表导出失败');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const matched = disposition.match(/filename="(.+)"/);
  const name = matched ? decodeURIComponent(matched[1]) : `${type}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function connectRealtime(onMessage, onStatus) {
  const token = getToken();
  if (!token) return () => {};
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws?token=${encodeURIComponent(token)}`);
  socket.addEventListener('open', () => onStatus?.('online'));
  socket.addEventListener('close', () => onStatus?.('offline'));
  socket.addEventListener('error', () => onStatus?.('offline'));
  socket.addEventListener('message', (event) => {
    try {
      onMessage?.(JSON.parse(event.data));
    } catch {
      onStatus?.('offline');
    }
  });
  return () => socket.close();
}
