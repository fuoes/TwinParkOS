export const navItems = [
  { id: 'dashboard', label: '首页驾驶舱', group: '总览' },
  { id: 'twin', label: '数字孪生一张图', group: '总览' },
  { id: 'devices', label: '设备运维', group: '运营' },
  { id: 'energy', label: '能耗管理', group: '运营' },
  { id: 'security', label: '安防管控', group: '运营' },
  { id: 'environment', label: '环境监测', group: '运营' },
  { id: 'workorders', label: '物业工单', group: '服务' },
  { id: 'enterprise', label: '企业服务', group: '服务' },
  { id: 'space', label: '空间资产', group: '服务' },
  { id: 'alarms', label: '告警中心', group: '治理' },
  { id: 'reports', label: '报表中心', group: '治理' },
  { id: 'system', label: '系统管理', group: '治理' }
];

export const kpis = [
  { label: '入驻企业', value: '96', unit: '家', delta: '+8.4%', tone: 'good', target: 'enterprise' },
  { label: '空间出租率', value: '87.6', unit: '%', delta: '+3.1%', tone: 'good', target: 'space' },
  { label: '在线设备', value: '1,284', unit: '台', delta: '98.2%', tone: 'good', target: 'devices' },
  { label: '今日告警', value: '23', unit: '条', delta: '-12%', tone: 'warn', target: 'alarms' },
  { label: '今日用电', value: '18,420', unit: 'kWh', delta: '+4.7%', tone: 'energy', target: 'energy' },
  { label: '待处理工单', value: '17', unit: '单', delta: '6 超时', tone: 'danger', target: 'workorders' },
  { label: '环境评分', value: '91', unit: '分', delta: '舒适', tone: 'good', target: 'environment' },
  { label: '车位占用', value: '72', unit: '%', delta: '318/442', tone: 'security', target: 'security' }
];

export const buildingStats = [
  { name: 'A1 创新研发楼', enterprises: 28, occupancy: 94, energy: 4280, alarms: 3, health: 96, floors: 12 },
  { name: 'B2 智造厂房', enterprises: 16, occupancy: 88, energy: 6350, alarms: 7, health: 89, floors: 6 },
  { name: 'C3 孵化中心', enterprises: 35, occupancy: 91, energy: 3920, alarms: 2, health: 94, floors: 9 },
  { name: 'D4 配套服务楼', enterprises: 17, occupancy: 76, energy: 2150, alarms: 1, health: 92, floors: 5 }
];

export const trendData = [
  { label: '00', energy: 660, alarms: 1, workorders: 2 },
  { label: '04', energy: 520, alarms: 2, workorders: 1 },
  { label: '08', energy: 1160, alarms: 5, workorders: 7 },
  { label: '12', energy: 1480, alarms: 4, workorders: 5 },
  { label: '16', energy: 1720, alarms: 8, workorders: 10 },
  { label: '20', energy: 1280, alarms: 3, workorders: 6 },
  { label: '24', energy: 780, alarms: 0, workorders: 3 }
];

export const realtimeAlarms = [
  { id: 'ALM-20260524-018', type: '消防', level: '一级严重', source: 'B2-3F 烟感', location: 'B2 智造厂房 3F', status: '未确认', time: '09:42', action: '联动视频' },
  { id: 'ALM-20260524-017', type: '设备', level: '二级紧急', source: '冷却泵 P-02', location: '能源站', status: '处理中', time: '09:31', action: '查看工单' },
  { id: 'ALM-20260524-016', type: '能耗', level: '三级一般', source: 'A1 总表', location: 'A1 创新研发楼', status: '已确认', time: '09:18', action: '核查趋势' },
  { id: 'ALM-20260524-015', type: '门禁', level: '三级一般', source: '东门岗', location: '园区东入口', status: '未确认', time: '09:08', action: '查看记录' }
];

export const devices = [
  { id: 'DEV-PD-001', name: 'A1 低压配电柜 1#', type: '配电设备', area: 'A1 B1 配电房', online: '在线', status: '正常', health: 97, owner: '陈工', alarm: '无' },
  { id: 'DEV-HVAC-014', name: 'B2 冷却泵 P-02', type: '暖通设备', area: '能源站', online: '在线', status: '故障', health: 58, owner: '刘工', alarm: '轴温过高' },
  { id: 'DEV-FIR-032', name: 'B2-3F 烟感 032', type: '消防设备', area: 'B2 3F 西区', online: '在线', status: '告警', health: 72, owner: '消控室', alarm: '烟雾浓度超限' },
  { id: 'DEV-CAM-118', name: '东门岗球机', type: '安防设备', area: '东入口', online: '在线', status: '正常', health: 91, owner: '安防班', alarm: '无' },
  { id: 'DEV-ENV-045', name: 'C3 中庭 CO2 传感器', type: '环境设备', area: 'C3 1F 中庭', online: '离线', status: '离线', health: 41, owner: '王工', alarm: '数据中断' }
];

export const energyRanking = [
  { name: 'B2 智造厂房', value: 6350, percent: 100 },
  { name: 'A1 创新研发楼', value: 4280, percent: 67 },
  { name: 'C3 孵化中心', value: 3920, percent: 62 },
  { name: 'D4 配套服务楼', value: 2150, percent: 34 }
];

export const workorders = [
  { id: 'WO-240524-082', title: '冷却泵轴温异常核查', type: '设备故障', source: '系统告警', location: '能源站', priority: '紧急', status: '处理中', owner: '刘工', sla: '10:20' },
  { id: 'WO-240524-081', title: 'B2 3F 烟感告警确认', type: '消防告警', source: '告警中心', location: 'B2 3F', priority: '严重', status: '待处理', owner: '消控室', sla: '09:57' },
  { id: 'WO-240524-080', title: 'C3 中庭传感器离线', type: '环境异常', source: '系统告警', location: 'C3 1F', priority: '一般', status: '待派单', owner: '未分配', sla: '13:20' },
  { id: 'WO-240524-079', title: 'A1 8F 会议室照明报修', type: '企业报修', source: '企业提交', location: 'A1 8F', priority: '一般', status: '待验收', owner: '赵工', sla: '明日 12:00' }
];

export const enterprises = [
  { name: '云启智能科技', building: 'A1', rooms: '801-806', area: 1480, industry: '人工智能', status: '在驻', bill: '正常' },
  { name: '芯联微电子', building: 'B2', rooms: '301-318', area: 5260, industry: '半导体', status: '在驻', bill: '正常' },
  { name: '智衡机器人', building: 'C3', rooms: '501-508', area: 1860, industry: '机器人', status: '即将到期', bill: '正常' },
  { name: '绿源储能', building: 'D4', rooms: '202-204', area: 920, industry: '新能源', status: '在驻', bill: '欠费' }
];

export const environmentPoints = [
  { name: 'A1 大堂', temp: 24.6, humidity: 58, pm25: 21, co2: 620, noise: 48, status: '正常' },
  { name: 'B2 生产走廊', temp: 29.8, humidity: 69, pm25: 46, co2: 840, noise: 63, status: '预警' },
  { name: 'C3 中庭', temp: 25.1, humidity: 55, pm25: 18, co2: 590, noise: 42, status: '离线' },
  { name: '地下泵房', temp: 27.4, humidity: 81, pm25: 35, co2: 760, noise: 57, status: '告警' }
];

export const roomAssets = [
  { room: 'A1-801', state: '已租', enterprise: '云启智能科技', area: '312㎡' },
  { room: 'A1-902', state: '空置', enterprise: '-', area: '286㎡' },
  { room: 'B2-308', state: '已租', enterprise: '芯联微电子', area: '620㎡' },
  { room: 'C3-602', state: '即将到期', enterprise: '智衡机器人', area: '260㎡' },
  { room: 'D4-203', state: '欠费异常', enterprise: '绿源储能', area: '310㎡' },
  { room: 'D4-501', state: '不可租', enterprise: '公共会议室', area: '180㎡' }
];

export const energyOverview = {
  electricityToday: 18420,
  waterToday: 612,
  carbonToday: 11.7,
  energyPerSquareMeter: 0.42
};

function replaceItems(target, source) {
  if (!Array.isArray(source)) return;
  target.splice(0, target.length, ...source);
}

export function hydrateData(payload) {
  replaceItems(kpis, payload.kpis);
  replaceItems(buildingStats, payload.buildings);
  replaceItems(devices, payload.devices);
  replaceItems(realtimeAlarms, payload.alarms);
  replaceItems(workorders, payload.workorders);
  replaceItems(enterprises, payload.enterprises);
  replaceItems(environmentPoints, payload.environment);
  replaceItems(trendData, payload.energySeries);
  replaceItems(energyRanking, payload.energyRanking);
  replaceItems(roomAssets, payload.rooms);
  if (payload.energyOverview) Object.assign(energyOverview, payload.energyOverview);
}

export function applyRealtimeEvent(event) {
  if (event.type === 'telemetry:update') {
    const device = devices.find((item) => item.id === event.payload.device?.id);
    if (device) device.telemetry = event.payload.device.telemetry;
    const point = environmentPoints.find((item) => item.id === event.payload.environment?.id);
    if (point) Object.assign(point, event.payload.environment);
    const electricity = kpis.find((item) => item.target === 'energy');
    if (electricity && event.payload.energyOverview?.electricityToday) {
      electricity.value = event.payload.energyOverview.electricityToday.toLocaleString();
    }
    if (event.payload.energyOverview) Object.assign(energyOverview, event.payload.energyOverview);
  }
}
