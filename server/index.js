import http from 'node:http';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { WebSocketServer } from 'ws';
import { resetStore, saveStore, store } from './store.js';

const PORT = Number(process.env.API_PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'twinpark-local-development-secret';
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const resourceConfigs = {
  devices: { read: 'device:read', manage: 'device:manage', prefix: 'DEV', required: ['name', 'type'] },
  inspections: { read: 'device:read', manage: 'device:manage', prefix: 'INS', required: ['name', 'object'] },
  maintenancePlans: { read: 'device:read', manage: 'device:manage', prefix: 'MNT', required: ['name', 'device'] },
  energyBills: { read: 'energy:read', manage: 'energy:manage', prefix: 'BILL', required: ['enterprise', 'period'] },
  cameras: { read: 'security:read', manage: 'security:manage', prefix: 'CAM', required: ['name', 'area'] },
  accessRecords: { read: 'security:read', manage: 'security:manage', prefix: 'ACC', required: ['person', 'gate'] },
  vehicles: { read: 'security:read', manage: 'security:manage', prefix: 'VEH', required: ['plate', 'owner'] },
  visitors: { read: 'security:read', manage: 'security:manage', prefix: 'VIS', required: ['name', 'enterprise'] },
  environment: { read: 'environment:read', manage: 'environment:manage', prefix: 'ENV', required: ['name'] },
  environmentThresholds: { read: 'environment:read', manage: 'environment:manage', prefix: 'THR', required: ['metric', 'warning', 'alarm'] },
  enterprises: { read: 'enterprise:read', manage: 'enterprise:manage', prefix: 'ENT', required: ['name', 'industry'] },
  serviceRequests: { read: 'enterprise:read', manage: 'enterprise:manage', prefix: 'SR', required: ['enterprise', 'type', 'title'] },
  announcements: { read: 'enterprise:read', manage: 'enterprise:manage', prefix: 'ANN', required: ['title', 'category'] },
  buildings: { read: 'space:read', manage: 'space:manage', prefix: 'BLD', required: ['name', 'floors'] },
  rooms: { read: 'space:read', manage: 'space:manage', prefix: 'ROOM', required: ['room', 'building'] },
  contracts: { read: 'space:read', manage: 'space:manage', prefix: 'CT', required: ['enterprise', 'rooms'] },
  alarmRules: { read: 'alarm:read', manage: 'alarm:manage', prefix: 'RULE', required: ['name', 'source', 'condition'] },
  dataDictionaries: { read: 'system:manage', manage: 'system:manage', prefix: 'DICT', required: ['category', 'code', 'label'] },
  integrations: { read: 'system:manage', manage: 'system:manage', prefix: 'INT', required: ['name', 'type'] }
};

const workorderTransitions = {
  '待受理': ['待派单', '已驳回'],
  '待派单': ['待处理', '已关闭'],
  '待处理': ['处理中', '已关闭'],
  '处理中': ['待验收', '已完成'],
  '待验收': ['已完成', '处理中'],
  '已完成': ['已关闭'],
  '已关闭': [],
  '已驳回': []
};

function nowIso() {
  return new Date().toISOString();
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Hong_Kong',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date).replaceAll('/', '-');
}

function makeId(prefix, collection) {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  const sequence = String(collection.length + 1).padStart(3, '0');
  return `${prefix}-${date}-${sequence}`;
}

function publicUser(user) {
  const role = store.roles.find((item) => item.id === user.roleId);
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    department: user.department,
    roleId: user.roleId,
    role: role?.name,
    enabled: user.enabled,
    lastLoginAt: user.lastLoginAt,
    menus: role?.menus || [],
    permissions: role?.permissions || []
  };
}

function publicRole(role) {
  return {
    id: role.id,
    name: role.name,
    menus: role.menus || [],
    permissions: role.permissions || []
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

function validateRequired(body, required) {
  return required.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
}

function audit(user, action, module, detail) {
  store.auditLogs ||= [];
  store.auditLogs.unshift({
    id: makeId('LOG', store.auditLogs),
    user: user?.name || '系统',
    action,
    module,
    detail,
    time: formatDateTime()
  });
  store.auditLogs = store.auditLogs.slice(0, 500);
}

function persistAndBroadcast(type, payload) {
  saveStore();
  broadcast({ type, payload });
}

function dashboardKpis() {
  const onlineDevices = store.devices.filter((item) => item.online === '在线').length;
  const openAlarms = store.alarms.filter((item) => !['已完成', '已关闭'].includes(item.status)).length;
  const openWorkorders = store.workorders.filter((item) => !['已完成', '已关闭', '已驳回'].includes(item.status)).length;
  const rentableRooms = store.rooms.filter((item) => item.state !== '不可租');
  const occupiedRooms = rentableRooms.filter((item) => item.state !== '空置');
  const occupancy = rentableRooms.length ? ((occupiedRooms.length / rentableRooms.length) * 100).toFixed(1) : '0.0';
  return [
    { label: '入驻企业', value: String(92 + store.enterprises.length), unit: '家', delta: '+8.4%', tone: 'good', target: 'enterprise' },
    { label: '空间出租率', value: occupancy, unit: '%', delta: '实时计算', tone: 'good', target: 'space' },
    { label: '在线设备', value: onlineDevices.toLocaleString(), unit: '台', delta: `${(store.devices.length ? (onlineDevices / store.devices.length) * 100 : 0).toFixed(1)}%`, tone: 'good', target: 'devices' },
    { label: '当前告警', value: String(openAlarms), unit: '条', delta: '实时更新', tone: 'warn', target: 'alarms' },
    { label: '今日用电', value: store.energyOverview.electricityToday.toLocaleString(), unit: 'kWh', delta: '+4.7%', tone: 'energy', target: 'energy' },
    { label: '待处理工单', value: String(openWorkorders), unit: '单', delta: 'SLA 监控中', tone: 'danger', target: 'workorders' },
    { label: '环境评分', value: String(environmentScore()), unit: '分', delta: '舒适', tone: 'good', target: 'environment' },
    { label: '车位占用', value: '72', unit: '%', delta: '318/442', tone: 'security', target: 'security' }
  ];
}

function environmentScore() {
  const abnormal = store.environment.filter((item) => item.status !== '正常').length;
  return Math.max(60, 98 - abnormal * 4);
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
    energyOverview: store.energyOverview,
    inspections: store.inspections,
    maintenancePlans: store.maintenancePlans,
    energyBills: store.energyBills,
    cameras: store.cameras,
    accessRecords: store.accessRecords,
    vehicles: store.vehicles,
    visitors: store.visitors,
    environmentThresholds: store.environmentThresholds,
    serviceRequests: store.serviceRequests,
    announcements: store.announcements,
    contracts: store.contracts,
    alarmRules: store.alarmRules,
    dataDictionaries: store.dataDictionaries,
    integrations: store.integrations,
    auditLogs: store.auditLogs,
    roles: store.roles.map(publicRole),
    users: store.users.map(publicUser),
    simulator: store.simulator
  };
}

function createSimulatedAlarm(overrides = {}) {
  const alarm = {
    id: makeId('ALM', store.alarms),
    type: overrides.type || '环境',
    level: overrides.level || '三级一般',
    source: overrides.source || '地下泵房水浸传感器',
    location: overrides.location || '地下泵房',
    status: '未确认',
    time: formatTime(),
    action: '三维定位',
    description: overrides.description || '虚拟设备数据触发阈值规则，请安排人员核查',
    deviceId: overrides.deviceId,
    createdAt: nowIso()
  };
  store.alarms.unshift(alarm);
  return alarm;
}

function createWorkorderFromAlarm(alarm, user) {
  const existing = store.workorders.find((item) => item.alarmId === alarm.id);
  if (existing) return { order: existing, reused: true };
  const order = {
    id: makeId('WO', store.workorders),
    title: `${alarm.source}异常处置`,
    type: `${alarm.type}告警`,
    source: '告警中心',
    location: alarm.location,
    priority: alarm.level.includes('一级') ? '严重' : alarm.level.includes('二级') ? '紧急' : '一般',
    status: '待派单',
    owner: '未分配',
    sla: alarm.level.includes('一级') ? '15 分钟' : '4 小时',
    alarmId: alarm.id,
    createdAt: nowIso(),
    createdBy: user.name,
    timeline: [{ status: '待派单', user: user.name, time: formatDateTime(), note: '由告警自动生成' }]
  };
  store.workorders.unshift(order);
  alarm.workorderId = order.id;
  alarm.status = '处理中';
  return { order, reused: false };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'twinpark-api', mode: 'virtual-demo', now: nowIso() });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = store.users.find((item) => item.username === username && item.enabled);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  user.lastLoginAt = nowIso();
  audit(publicUser(user), '登录系统', '认证', `${user.name} 登录运营中心`);
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

app.get('/api/resources/:resource', authenticate, (req, res) => {
  const config = resourceConfigs[req.params.resource];
  if (!config || !Array.isArray(store[req.params.resource])) return res.status(404).json({ message: '资源不存在' });
  if (!can(req.user, config.read)) return res.status(403).json({ message: '当前角色没有查看权限' });
  return res.json({ items: store[req.params.resource] });
});

app.post('/api/resources/:resource', authenticate, (req, res) => {
  const resource = req.params.resource;
  const config = resourceConfigs[resource];
  const collection = store[resource];
  if (!config || !Array.isArray(collection)) return res.status(404).json({ message: '资源不存在' });
  if (!can(req.user, config.manage)) return res.status(403).json({ message: '当前角色没有操作权限' });
  const missing = validateRequired(req.body || {}, config.required);
  if (missing.length) return res.status(400).json({ message: `缺少必填字段：${missing.join('、')}` });
  const item = {
    ...req.body,
    id: req.body.id || makeId(config.prefix, collection),
    createdAt: req.body.createdAt || nowIso(),
    createdBy: req.user.name
  };
  collection.unshift(item);
  audit(req.user, '新增', resource, `新增 ${item.name || item.title || item.id}`);
  persistAndBroadcast(`${resource}:created`, item);
  return res.status(201).json({ item });
});

app.patch('/api/resources/:resource/:id', authenticate, (req, res) => {
  const resource = req.params.resource;
  const config = resourceConfigs[resource];
  const collection = store[resource];
  if (!config || !Array.isArray(collection)) return res.status(404).json({ message: '资源不存在' });
  if (!can(req.user, config.manage)) return res.status(403).json({ message: '当前角色没有操作权限' });
  const item = collection.find((entry) => entry.id === req.params.id);
  if (!item) return res.status(404).json({ message: '记录不存在' });
  Object.assign(item, req.body, { id: item.id, updatedAt: nowIso(), updatedBy: req.user.name });
  audit(req.user, '编辑', resource, `编辑 ${item.name || item.title || item.id}`);
  persistAndBroadcast(`${resource}:updated`, item);
  return res.json({ item });
});

app.delete('/api/resources/:resource/:id', authenticate, (req, res) => {
  const resource = req.params.resource;
  const config = resourceConfigs[resource];
  const collection = store[resource];
  if (!config || !Array.isArray(collection)) return res.status(404).json({ message: '资源不存在' });
  if (!can(req.user, config.manage)) return res.status(403).json({ message: '当前角色没有操作权限' });
  const index = collection.findIndex((entry) => entry.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: '记录不存在' });
  const [item] = collection.splice(index, 1);
  audit(req.user, '删除', resource, `删除 ${item.name || item.title || item.id}`);
  persistAndBroadcast(`${resource}:deleted`, { id: item.id });
  return res.json({ item });
});

app.post('/api/devices/:deviceId/control', authenticate, permit('device:manage'), (req, res) => {
  const device = store.devices.find((item) => item.id === req.params.deviceId);
  if (!device) return res.status(404).json({ message: '设备不存在' });
  const action = req.body?.action;
  const states = {
    start: { online: '在线', status: '正常', alarm: '无', health: Math.max(device.health, 85) },
    stop: { online: '在线', status: '停止', alarm: '无' },
    offline: { online: '离线', status: '离线', alarm: '数据中断', health: Math.min(device.health, 55) },
    recover: { online: '在线', status: '正常', alarm: '无', health: Math.max(device.health, 90) },
    fault: { online: '在线', status: '故障', alarm: req.body?.reason || '虚拟故障', health: Math.min(device.health, 45) }
  };
  if (!states[action]) return res.status(400).json({ message: '不支持的设备控制动作' });
  Object.assign(device, states[action], { updatedAt: nowIso() });
  let alarm;
  if (action === 'fault' || action === 'offline') {
    alarm = createSimulatedAlarm({
      type: '设备',
      level: action === 'fault' ? '二级紧急' : '三级一般',
      source: device.name,
      location: device.area,
      deviceId: device.id,
      description: action === 'fault' ? `${device.name}发生虚拟故障：${device.alarm}` : `${device.name}虚拟通信中断`
    });
  }
  audit(req.user, '虚拟控制', '设备运维', `${device.name} 执行 ${action}`);
  saveStore();
  broadcast({ type: 'device:updated', payload: device });
  if (alarm) broadcast({ type: 'alarm:new', payload: alarm });
  return res.json({ item: device, alarm });
});

app.get('/api/alarms', authenticate, permit('alarm:read'), (_req, res) => {
  res.json({ items: store.alarms });
});

app.post('/api/alarms/:alarmId/acknowledge', authenticate, permit('alarm:manage'), (req, res) => {
  const alarm = store.alarms.find((item) => item.id === req.params.alarmId);
  if (!alarm) return res.status(404).json({ message: '告警不存在' });
  alarm.status = '已确认';
  alarm.acknowledgedBy = req.user.name;
  alarm.acknowledgedAt = nowIso();
  audit(req.user, '确认告警', '告警中心', `${alarm.id} ${alarm.source}`);
  persistAndBroadcast('alarm:updated', alarm);
  return res.json({ item: alarm });
});

app.post('/api/alarms/:alarmId/close', authenticate, permit('alarm:manage'), (req, res) => {
  const alarm = store.alarms.find((item) => item.id === req.params.alarmId);
  if (!alarm) return res.status(404).json({ message: '告警不存在' });
  alarm.status = '已关闭';
  alarm.closedBy = req.user.name;
  alarm.closedAt = nowIso();
  alarm.result = req.body?.result || '已核查并关闭';
  audit(req.user, '关闭告警', '告警中心', `${alarm.id} ${alarm.source}`);
  persistAndBroadcast('alarm:updated', alarm);
  return res.json({ item: alarm });
});

app.post('/api/alarms/:alarmId/workorders', authenticate, permit('workorder:manage'), (req, res) => {
  const alarm = store.alarms.find((item) => item.id === req.params.alarmId);
  if (!alarm) return res.status(404).json({ message: '告警不存在' });
  const { order, reused } = createWorkorderFromAlarm(alarm, req.user);
  audit(req.user, '生成工单', '告警中心', `${alarm.id} 生成 ${order.id}`);
  saveStore();
  broadcast({ type: 'workorder:created', payload: order });
  broadcast({ type: 'alarm:updated', payload: alarm });
  return res.status(reused ? 200 : 201).json({ item: order, reused });
});

app.get('/api/workorders', authenticate, permit('workorder:read'), (_req, res) => {
  res.json({ items: store.workorders });
});

app.post('/api/workorders', authenticate, permit('workorder:manage'), (req, res) => {
  const body = req.body || {};
  const missing = validateRequired(body, ['title', 'type']);
  if (missing.length) return res.status(400).json({ message: '工单标题和类型不能为空' });
  const order = {
    id: makeId('WO', store.workorders),
    title: body.title,
    type: body.type,
    source: body.source || '人工创建',
    location: body.location || '待补充',
    priority: body.priority || '一般',
    status: body.status || '待派单',
    owner: body.owner || '未分配',
    sla: body.sla || '48 小时',
    description: body.description || '',
    createdAt: nowIso(),
    createdBy: req.user.name,
    timeline: [{ status: body.status || '待派单', user: req.user.name, time: formatDateTime(), note: '创建工单' }]
  };
  store.workorders.unshift(order);
  audit(req.user, '新增工单', '物业工单', `${order.id} ${order.title}`);
  persistAndBroadcast('workorder:created', order);
  return res.status(201).json({ item: order });
});

app.patch('/api/workorders/:orderId', authenticate, permit('workorder:manage'), (req, res) => {
  const order = store.workorders.find((item) => item.id === req.params.orderId);
  if (!order) return res.status(404).json({ message: '工单不存在' });
  const nextStatus = req.body?.status;
  if (nextStatus && nextStatus !== order.status) {
    const allowed = workorderTransitions[order.status] || [];
    if (!allowed.includes(nextStatus) && !can(req.user, '*')) {
      return res.status(400).json({ message: `工单不能从“${order.status}”直接变更为“${nextStatus}”` });
    }
    order.timeline ||= [];
    order.timeline.push({
      status: nextStatus,
      user: req.user.name,
      time: formatDateTime(),
      note: req.body?.result || req.body?.note || '状态变更'
    });
  }
  ['status', 'owner', 'result', 'description', 'priority', 'location'].forEach((key) => {
    if (req.body?.[key] !== undefined) order[key] = req.body[key];
  });
  order.updatedAt = nowIso();
  if (['已完成', '已关闭'].includes(order.status)) order.completedAt = nowIso();
  if (order.alarmId && ['已完成', '已关闭'].includes(order.status)) {
    const alarm = store.alarms.find((item) => item.id === order.alarmId);
    if (alarm) {
      alarm.status = '已关闭';
      alarm.closedAt = nowIso();
      alarm.result = order.result || '关联工单已完成';
    }
  }
  audit(req.user, '更新工单', '物业工单', `${order.id} 更新为 ${order.status}`);
  persistAndBroadcast('workorder:updated', order);
  return res.json({ item: order });
});

app.get('/api/enterprises', authenticate, permit('enterprise:read'), (_req, res) => {
  res.json({ items: store.enterprises });
});

app.get('/api/spaces', authenticate, permit('space:read'), (_req, res) => {
  res.json({ buildings: store.buildings, rooms: store.rooms, contracts: store.contracts });
});

app.get('/api/energy/overview', authenticate, permit('energy:read'), (_req, res) => {
  res.json({ overview: store.energyOverview, series: store.energySeries, ranking: store.energyRanking, bills: store.energyBills });
});

app.get('/api/environment', authenticate, permit('environment:read'), (_req, res) => {
  res.json({ items: store.environment, thresholds: store.environmentThresholds, score: environmentScore() });
});

app.get('/api/users', authenticate, permit('system:manage'), (_req, res) => {
  res.json({ items: store.users.map(publicUser) });
});

app.post('/api/users', authenticate, permit('system:manage'), (req, res) => {
  const body = req.body || {};
  const missing = validateRequired(body, ['username', 'name', 'password', 'roleId']);
  if (missing.length) return res.status(400).json({ message: `缺少必填字段：${missing.join('、')}` });
  if (store.users.some((item) => item.username === body.username)) return res.status(409).json({ message: '用户名已存在' });
  const user = {
    id: makeId('USER', store.users),
    username: body.username,
    name: body.name,
    passwordHash: bcrypt.hashSync(body.password, 10),
    roleId: body.roleId,
    department: body.department || '未分配',
    enabled: body.enabled !== false,
    createdAt: nowIso()
  };
  store.users.push(user);
  audit(req.user, '新增用户', '系统管理', `${user.username} ${user.name}`);
  saveStore();
  return res.status(201).json({ item: publicUser(user) });
});

app.patch('/api/users/:userId', authenticate, permit('system:manage'), (req, res) => {
  const user = store.users.find((item) => item.id === req.params.userId);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  ['name', 'roleId', 'department', 'enabled'].forEach((key) => {
    if (req.body?.[key] !== undefined) user[key] = req.body[key];
  });
  if (req.body?.password) user.passwordHash = bcrypt.hashSync(req.body.password, 10);
  audit(req.user, '编辑用户', '系统管理', `${user.username} ${user.name}`);
  saveStore();
  return res.json({ item: publicUser(user) });
});

app.delete('/api/users/:userId', authenticate, permit('system:manage'), (req, res) => {
  if (req.params.userId === req.user.id) return res.status(400).json({ message: '不能删除当前登录用户' });
  const index = store.users.findIndex((item) => item.id === req.params.userId);
  if (index < 0) return res.status(404).json({ message: '用户不存在' });
  const [user] = store.users.splice(index, 1);
  audit(req.user, '删除用户', '系统管理', `${user.username} ${user.name}`);
  saveStore();
  return res.json({ item: publicUser(user) });
});

app.get('/api/roles', authenticate, permit('system:manage'), (_req, res) => {
  res.json({ items: store.roles.map(publicRole) });
});

app.post('/api/roles', authenticate, permit('system:manage'), (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ message: '角色名称不能为空' });
  const role = {
    id: makeId('ROLE', store.roles),
    name: body.name,
    menus: body.menus || [],
    permissions: body.permissions || []
  };
  store.roles.push(role);
  audit(req.user, '新增角色', '系统管理', role.name);
  saveStore();
  return res.status(201).json({ item: publicRole(role) });
});

app.patch('/api/roles/:roleId', authenticate, permit('system:manage'), (req, res) => {
  const role = store.roles.find((item) => item.id === req.params.roleId);
  if (!role) return res.status(404).json({ message: '角色不存在' });
  ['name', 'menus', 'permissions'].forEach((key) => {
    if (req.body?.[key] !== undefined) role[key] = req.body[key];
  });
  audit(req.user, '编辑角色', '系统管理', role.name);
  saveStore();
  return res.json({ item: publicRole(role) });
});

app.delete('/api/roles/:roleId', authenticate, permit('system:manage'), (req, res) => {
  if (store.users.some((item) => item.roleId === req.params.roleId)) return res.status(400).json({ message: '角色仍有关联用户，不能删除' });
  const index = store.roles.findIndex((item) => item.id === req.params.roleId);
  if (index < 0) return res.status(404).json({ message: '角色不存在' });
  const [role] = store.roles.splice(index, 1);
  audit(req.user, '删除角色', '系统管理', role.name);
  saveStore();
  return res.json({ item: publicRole(role) });
});

app.get('/api/audit-logs', authenticate, permit('system:manage'), (_req, res) => {
  res.json({ items: store.auditLogs });
});

app.post('/api/simulator/alarms', authenticate, permit('alarm:manage'), (req, res) => {
  const alarm = createSimulatedAlarm(req.body);
  audit(req.user, '模拟告警', '虚拟仿真', `${alarm.type} ${alarm.source}`);
  persistAndBroadcast('alarm:new', alarm);
  return res.status(201).json({ item: alarm });
});

app.get('/api/simulator/status', authenticate, (_req, res) => {
  res.json({ item: store.simulator });
});

app.patch('/api/simulator/status', authenticate, permit('device:manage'), (req, res) => {
  Object.assign(store.simulator, req.body || {}, { updatedAt: nowIso() });
  audit(req.user, '配置仿真器', '虚拟仿真', JSON.stringify(req.body || {}));
  persistAndBroadcast('simulator:updated', store.simulator);
  return res.json({ item: store.simulator });
});

app.post('/api/simulator/scenarios/:scenario', authenticate, permit('device:manage'), (req, res) => {
  const scenario = req.params.scenario;
  const result = runScenario(scenario);
  if (!result) return res.status(400).json({ message: '不支持的虚拟场景' });
  store.simulator.scenario = result.name;
  store.simulator.lastScenarioAt = nowIso();
  audit(req.user, '运行场景', '虚拟仿真', result.name);
  saveStore();
  broadcast({ type: 'scenario:ran', payload: result });
  return res.json({ item: result });
});

app.post('/api/system/reset-demo', authenticate, permit('system:manage'), (req, res) => {
  resetStore();
  audit(req.user, '重置演示数据', '系统管理', '恢复全部初始虚拟演示数据');
  saveStore();
  broadcast({ type: 'demo:reset', payload: { at: nowIso() } });
  return res.json({ message: '演示数据已恢复' });
});

app.get('/api/reports/summary', authenticate, permit('report:read'), (_req, res) => {
  res.json({
    items: [
      { name: '园区运营日报', category: '运营', count: store.enterprises.length, metric: '入驻企业' },
      { name: '设备运行报表', category: '设备', count: store.devices.length, metric: '设备总数' },
      { name: '能耗月报', category: '能源', count: store.energyOverview.electricityToday, metric: '今日用电 kWh' },
      { name: '安防事件报表', category: '安防', count: store.alarms.filter((item) => ['安防', '门禁', '消防'].includes(item.type)).length, metric: '事件数' },
      { name: '工单效率报表', category: '物业', count: store.workorders.length, metric: '工单总数' }
    ]
  });
});

app.get('/api/reports/:type/export', authenticate, permit('report:read'), (req, res) => {
  const report = reportData(req.params.type);
  if (!report) return res.status(404).json({ message: '报表类型不存在' });
  audit(req.user, '导出报表', '报表中心', report.name);
  saveStore();
  const csv = toCsv(report.columns, report.rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.fileName)}"`);
  return res.send(`\uFEFF${csv}`);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(data);
  });
}

function runScenario(scenario) {
  if (scenario === 'normal') {
    store.devices.forEach((device) => Object.assign(device, { online: '在线', status: '正常', alarm: '无', health: Math.max(device.health, 88) }));
    store.environment.forEach((point) => Object.assign(point, { status: '正常' }));
    return { name: '日常运营', message: '全部虚拟设备恢复正常运行' };
  }
  if (scenario === 'fire') {
    const device = store.devices.find((item) => item.type === '消防设备');
    if (!device) return { name: '消防火警', message: '当前没有消防虚拟设备，请先新增设备' };
    Object.assign(device, { online: '在线', status: '告警', alarm: '烟雾浓度超限', health: 65 });
    const alarm = createSimulatedAlarm({ type: '消防', level: '一级严重', source: device.name, location: device.area, deviceId: device.id, description: '虚拟消防火警场景触发' });
    return { name: '消防火警', message: '已触发消防火警与视频联动', alarm };
  }
  if (scenario === 'pump-fault') {
    const device = store.devices.find((item) => item.type === '暖通设备');
    if (!device) return { name: '冷却泵故障', message: '当前没有暖通虚拟设备，请先新增设备' };
    Object.assign(device, { online: '在线', status: '故障', alarm: '轴温过高', health: 42, telemetry: { ...device.telemetry, temperature: 82.6 } });
    const alarm = createSimulatedAlarm({ type: '设备', level: '二级紧急', source: device.name, location: device.area, deviceId: device.id, description: '虚拟冷却泵故障场景触发' });
    return { name: '冷却泵故障', message: '已触发暖通设备故障', alarm };
  }
  if (scenario === 'energy-spike') {
    store.energyOverview.electricityToday += 680;
    const alarm = createSimulatedAlarm({ type: '能耗', level: '三级一般', source: 'A1 总表', location: 'A1 创新研发楼', description: '虚拟用电突增场景触发' });
    return { name: '能耗突增', message: '今日用电量已模拟上升', alarm };
  }
  if (scenario === 'environment') {
    const point = store.environment.find((item) => item.id === 'env-pump-room');
    Object.assign(point, { humidity: 92, status: '告警' });
    const alarm = createSimulatedAlarm({ type: '环境', level: '二级紧急', source: '地下泵房水浸传感器', location: '地下泵房', description: '虚拟水浸场景触发' });
    return { name: '地下泵房水浸', message: '已触发环境告警', alarm };
  }
  if (scenario === 'access') {
    const alarm = createSimulatedAlarm({ type: '门禁', level: '三级一般', source: '东门岗', location: '园区东入口', description: '虚拟异常通行场景触发' });
    store.accessRecords.unshift({ id: makeId('ACC', store.accessRecords), person: '未知访客', enterprise: '-', gate: '东门岗', direction: '入园', time: formatTime(), result: '拒绝' });
    return { name: '异常通行', message: '已触发门禁异常', alarm };
  }
  return null;
}

function reportData(type) {
  const reports = {
    operations: { name: '园区运营日报', fileName: '园区运营日报.csv', columns: ['指标', '数值'], rows: dashboardKpis().map((item) => [item.label, `${item.value}${item.unit}`]) },
    devices: { name: '设备运行报表', fileName: '设备运行报表.csv', columns: ['设备编号', '设备名称', '类型', '位置', '在线状态', '运行状态', '健康评分'], rows: store.devices.map((item) => [item.id, item.name, item.type, item.area, item.online, item.status, item.health]) },
    energy: { name: '能耗账单报表', fileName: '能耗账单报表.csv', columns: ['账单编号', '企业', '周期', '用电量', '用水量', '金额', '状态'], rows: store.energyBills.map((item) => [item.id, item.enterprise, item.period, item.electricity, item.water, item.amount, item.status]) },
    alarms: { name: '告警事件报表', fileName: '告警事件报表.csv', columns: ['告警编号', '类型', '等级', '来源', '位置', '状态', '时间'], rows: store.alarms.map((item) => [item.id, item.type, item.level, item.source, item.location, item.status, item.time]) },
    workorders: { name: '工单效率报表', fileName: '工单效率报表.csv', columns: ['工单编号', '标题', '类型', '优先级', '状态', '处理人'], rows: store.workorders.map((item) => [item.id, item.title, item.type, item.priority, item.status, item.owner]) }
  };
  return reports[type];
}

function toCsv(columns, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
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
  client.send(JSON.stringify({ type: 'realtime:ready', payload: { connectedAt: nowIso(), simulator: store.simulator } }));
});

let tick = 0;
const simulatorTimer = setInterval(() => {
  if (!store.simulator.enabled) return;
  tick += 1;
  store.devices.forEach((device, index) => {
    if (device.online !== '在线') return;
    if (device.type === '配电设备') {
      device.telemetry.current = Number((122 + Math.random() * 10).toFixed(1));
      device.telemetry.voltage = Number((379 + Math.random() * 7).toFixed(1));
      device.telemetry.temperature = Number((35 + Math.random() * 3).toFixed(1));
    }
    if (device.type === '暖通设备' && device.status !== '故障') {
      device.telemetry.current = Number((42 + Math.random() * 5).toFixed(1));
      device.telemetry.temperature = Number((45 + Math.random() * 5).toFixed(1));
    }
    device.lastDataAt = nowIso();
    device.health = Math.max(0, Math.min(100, Number((device.health + (Math.random() - 0.5) * 0.4).toFixed(1))));
    if (index === 0) broadcast({ type: 'device:telemetry', payload: device });
  });
  store.environment.forEach((point) => {
    if (point.status === '离线') return;
    point.temp = Number((point.temp + (Math.random() - 0.5) * 0.3).toFixed(1));
    point.co2 = Math.max(400, Math.round(point.co2 + (Math.random() - 0.5) * 20));
    point.updatedAt = nowIso();
  });
  store.energyOverview.electricityToday += Math.round((3 + Math.random() * 5) * (store.simulator.speed || 1));
  store.energyOverview.waterToday = Number((store.energyOverview.waterToday + Math.random() * 0.3).toFixed(1));
  broadcast({
    type: 'telemetry:update',
    payload: {
      device: store.devices[0] ? { id: store.devices[0].id, telemetry: store.devices[0].telemetry } : null,
      environment: store.environment[0] || null,
      energyOverview: store.energyOverview,
      at: nowIso()
    }
  });
  if (store.simulator.autoAlarm && tick % 24 === 0) {
    const alarm = createSimulatedAlarm();
    broadcast({ type: 'alarm:new', payload: alarm });
  }
  if (tick % 8 === 0) saveStore();
}, 5000);

server.listen(PORT, () => {
  console.log(`TwinParkOS API listening on http://localhost:${PORT}`);
});

function shutdown() {
  clearInterval(simulatorTimer);
  saveStore();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
