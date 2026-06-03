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
