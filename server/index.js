import http from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { WebSocketServer } from 'ws';
import { saveStore, store } from './store.js';

const PORT = Number(process.env.API_PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'twinpark-local-development-secret';
const app = express();

app.use(cors());
app.use(express.json());

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function publicUser(user) {
  const role = store.roles.find((item) => item.id === user.roleId);
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    department: user.department,
    role: role?.name,
    menus: role?.menus || [],
    permissions: role?.permissions || []
  };
}

function can(user, permission) {
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' });
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: '请先登录' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = store.users.find((item) => item.id === payload.sub && item.enabled);
    if (!user) return res.status(401).json({ message: '登录状态已失效' });
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ message: '登录状态已失效' });
  }
}

function permit(permission) {
  return (req, res, next) => {
    if (!can(req.user, permission)) return res.status(403).json({ message: '当前角色没有此操作权限' });
    next();
  };
}

function dashboardKpis() {
  const onlineDevices = store.devices.filter((item) => item.online === '在线').length;
  const openAlarms = store.alarms.filter((item) => !['已完成', '已关闭'].includes(item.status)).length;
  const openWorkorders = store.workorders.filter((item) => !['已完成', '已关闭'].includes(item.status)).length;
  return [
    { label: '入驻企业', value: '96', unit: '家', delta: '+8.4%', tone: 'good', target: 'enterprise' },
    { label: '空间出租率', value: '87.6', unit: '%', delta: '+3.1%', tone: 'good', target: 'space' },
    { label: '在线设备', value: onlineDevices.toLocaleString(), unit: '台', delta: `${((onlineDevices / store.devices.length) * 100).toFixed(1)}%`, tone: 'good', target: 'devices' },
    { label: '当前告警', value: String(openAlarms), unit: '条', delta: '实时更新', tone: 'warn', target: 'alarms' },
    { label: '今日用电', value: store.energyOverview.electricityToday.toLocaleString(), unit: 'kWh', delta: '+4.7%', tone: 'energy', target: 'energy' },
    { label: '待处理工单', value: String(openWorkorders), unit: '单', delta: 'SLA 监控中', tone: 'danger', target: 'workorders' },
    { label: '环境评分', value: '91', unit: '分', delta: '舒适', tone: 'good', target: 'environment' },
    { label: '车位占用', value: '72', unit: '%', delta: '318/442', tone: 'security', target: 'security' }
  ];
}

function bootstrapPayload() {
  return {
    meta: store.meta,
    kpis: dashboardKpis(),
    buildings: store.buildings,
    devices: store.devices,
    alarms: store.alarms,
    workorders: store.workorders,
    enterprises: store.enterprises,
    rooms: store.rooms,
    environment: store.environment,
    energySeries: store.energySeries,
    energyRanking: store.energyRanking,
    energyOverview: store.energyOverview
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'twinpark-api', now: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = store.users.find((item) => item.username === username && item.enabled);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  user.lastLoginAt = new Date().toISOString();
  saveStore();
  return res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/bootstrap', authenticate, (req, res) => {
  res.json(bootstrapPayload());
});

app.get('/api/dashboard', authenticate, permit('dashboard:read'), (_req, res) => {
  res.json({ kpis: dashboardKpis(), buildings: store.buildings });
});

app.get('/api/devices', authenticate, permit('device:read'), (_req, res) => {
  res.json({ items: store.devices });
});

app.get('/api/alarms', authenticate, permit('alarm:read'), (_req, res) => {
  res.json({ items: store.alarms });
});

app.post('/api/alarms/:alarmId/acknowledge', authenticate, permit('alarm:manage'), (req, res) => {
  const alarm = store.alarms.find((item) => item.id === req.params.alarmId);
  if (!alarm) return res.status(404).json({ message: '告警不存在' });
  alarm.status = '已确认';
  alarm.acknowledgedBy = req.user.name;
  alarm.acknowledgedAt = new Date().toISOString();
  saveStore();
  broadcast({ type: 'alarm:updated', payload: alarm });
  return res.json({ item: alarm });
});

app.post('/api/alarms/:alarmId/workorders', authenticate, permit('workorder:manage'), (req, res) => {
  const alarm = store.alarms.find((item) => item.id === req.params.alarmId);
  if (!alarm) return res.status(404).json({ message: '告警不存在' });
  const existing = store.workorders.find((item) => item.alarmId === alarm.id);
  if (existing) return res.json({ item: existing, reused: true });

  const id = `WO-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${String(store.workorders.length + 1).padStart(3, '0')}`;
  const order = {
    id,
    title: `${alarm.source}异常处置`,
    type: `${alarm.type}告警`,
    source: '告警中心',
    location: alarm.location,
    priority: alarm.level.includes('一级') ? '严重' : alarm.level.includes('二级') ? '紧急' : '一般',
    status: '待派单',
    owner: '未分配',
    sla: alarm.level.includes('一级') ? '15 分钟' : '4 小时',
    alarmId: alarm.id,
    createdAt: new Date().toISOString(),
    createdBy: req.user.name
  };
  store.workorders.unshift(order);
  alarm.workorderId = order.id;
  alarm.status = '处理中';
  saveStore();
  broadcast({ type: 'workorder:created', payload: order });
  broadcast({ type: 'alarm:updated', payload: alarm });
  return res.status(201).json({ item: order });
});

app.get('/api/workorders', authenticate, permit('workorder:read'), (_req, res) => {
  res.json({ items: store.workorders });
});

app.post('/api/workorders', authenticate, permit('workorder:manage'), (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.type) return res.status(400).json({ message: '工单标题和类型不能为空' });
  const order = {
    id: `WO-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${String(store.workorders.length + 1).padStart(3, '0')}`,
    title: body.title,
    type: body.type,
    source: body.source || '人工创建',
    location: body.location || '待补充',
    priority: body.priority || '一般',
    status: '待派单',
    owner: body.owner || '未分配',
    sla: body.sla || '48 小时',
    createdAt: new Date().toISOString(),
    createdBy: req.user.name
  };
  store.workorders.unshift(order);
  saveStore();
  broadcast({ type: 'workorder:created', payload: order });
  return res.status(201).json({ item: order });
});

app.patch('/api/workorders/:orderId', authenticate, permit('workorder:manage'), (req, res) => {
  const order = store.workorders.find((item) => item.id === req.params.orderId);
  if (!order) return res.status(404).json({ message: '工单不存在' });
  ['status', 'owner', 'result'].forEach((key) => {
    if (req.body?.[key]) order[key] = req.body[key];
  });
  order.updatedAt = new Date().toISOString();
  saveStore();
  broadcast({ type: 'workorder:updated', payload: order });
  return res.json({ item: order });
});

app.get('/api/enterprises', authenticate, permit('enterprise:read'), (_req, res) => {
  res.json({ items: store.enterprises });
});

app.get('/api/spaces', authenticate, permit('space:read'), (_req, res) => {
  res.json({ buildings: store.buildings, rooms: store.rooms });
});

app.get('/api/energy/overview', authenticate, permit('energy:read'), (_req, res) => {
  res.json({ overview: store.energyOverview, series: store.energySeries, ranking: store.energyRanking });
});

app.get('/api/environment', authenticate, (_req, res) => {
  res.json({ items: store.environment });
});

app.get('/api/users', authenticate, permit('system:manage'), (_req, res) => {
  res.json({ items: store.users.map(publicUser) });
});

app.post('/api/simulator/alarms', authenticate, permit('alarm:manage'), (req, res) => {
  const alarm = createSimulatedAlarm(req.body);
  saveStore();
  broadcast({ type: 'alarm:new', payload: alarm });
  return res.status(201).json({ item: alarm });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(data);
  });
}

function createSimulatedAlarm(overrides = {}) {
  const sequence = String(store.alarms.length + 1).padStart(3, '0');
  const alarm = {
    id: `ALM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${sequence}`,
    type: overrides.type || '环境',
    level: overrides.level || '三级一般',
    source: overrides.source || '地下泵房水浸传感器',
    location: overrides.location || '地下泵房',
    status: '未确认',
    time: formatTime(),
    action: '三维定位',
    description: overrides.description || '模拟数据触发阈值规则，请安排人员核查'
  };
  store.alarms.unshift(alarm);
  return alarm;
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname !== '/ws') return socket.destroy();
  try {
    const payload = jwt.verify(url.searchParams.get('token'), JWT_SECRET);
    const user = store.users.find((item) => item.id === payload.sub && item.enabled);
    if (!user) return socket.destroy();
    wss.handleUpgrade(request, socket, head, (client) => {
      client.userId = user.id;
      wss.emit('connection', client);
    });
  } catch {
    socket.destroy();
  }
});

wss.on('connection', (client) => {
  client.send(JSON.stringify({ type: 'realtime:ready', payload: { connectedAt: new Date().toISOString() } }));
});

let tick = 0;
const simulator = setInterval(() => {
  tick += 1;
  const device = store.devices[0];
  device.telemetry.current = Number((124 + Math.random() * 7).toFixed(1));
  device.telemetry.voltage = Number((380 + Math.random() * 5).toFixed(1));
  const point = store.environment[0];
  point.temp = Number((24.2 + Math.random() * 1.4).toFixed(1));
  point.co2 = Math.round(600 + Math.random() * 70);
  store.energyOverview.electricityToday += Math.round(3 + Math.random() * 5);
  broadcast({
    type: 'telemetry:update',
    payload: {
      device: { id: device.id, telemetry: device.telemetry },
      environment: point,
      energyOverview: store.energyOverview,
      at: new Date().toISOString()
    }
  });
  if (tick % 8 === 0) saveStore();
}, 5000);

server.listen(PORT, () => {
  console.log(`TwinParkOS API listening on http://localhost:${PORT}`);
});

function shutdown() {
  clearInterval(simulator);
  saveStore();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
