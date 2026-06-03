import bcrypt from 'bcryptjs';

const hash = (value) => bcrypt.hashSync(value, 10);

export function createSeedData() {
  return {
    meta: {
      version: 1,
      parkName: '科创产业园',
      lastPersistedAt: new Date().toISOString()
    },
    roles: [
      {
        id: 'role-admin',
        name: '系统管理员',
        menus: ['dashboard', 'twin', 'devices', 'energy', 'security', 'environment', 'workorders', 'enterprise', 'space', 'alarms', 'reports', 'system'],
        permissions: ['*']
      },
      {
        id: 'role-operator',
        name: '运营管理人员',
        menus: ['dashboard', 'twin', 'devices', 'energy', 'security', 'environment', 'workorders', 'enterprise', 'space', 'alarms', 'reports'],
        permissions: ['dashboard:read', 'device:read', 'energy:read', 'alarm:read', 'alarm:manage', 'workorder:read', 'workorder:manage', 'enterprise:read', 'space:read']
      },
      {
        id: 'role-engineer',
        name: '物业运维人员',
        menus: ['dashboard', 'twin', 'devices', 'environment', 'workorders', 'alarms'],
        permissions: ['dashboard:read', 'device:read', 'alarm:read', 'workorder:read', 'workorder:manage']
      }
    ],
    users: [
      { id: 'user-admin', username: 'admin', name: '平台管理员', passwordHash: hash('admin123'), roleId: 'role-admin', department: '信息化管理部', enabled: true },
      { id: 'user-operator', username: 'operator', name: '运营中心', passwordHash: hash('operator123'), roleId: 'role-operator', department: '运营服务部', enabled: true },
      { id: 'user-engineer', username: 'engineer', name: '刘工', passwordHash: hash('engineer123'), roleId: 'role-engineer', department: '物业工程部', enabled: true }
    ],
    buildings: [
      { id: 'building-a1', name: 'A1 创新研发楼', enterprises: 28, occupancy: 94, energy: 4280, alarms: 3, health: 96, floors: 12 },
      { id: 'building-b2', name: 'B2 智造厂房', enterprises: 16, occupancy: 88, energy: 6350, alarms: 7, health: 89, floors: 6 },
      { id: 'building-c3', name: 'C3 孵化中心', enterprises: 35, occupancy: 91, energy: 3920, alarms: 2, health: 94, floors: 9 },
      { id: 'building-d4', name: 'D4 配套服务楼', enterprises: 17, occupancy: 76, energy: 2150, alarms: 1, health: 92, floors: 5 }
    ],
    devices: [
      { id: 'DEV-PD-001', name: 'A1 低压配电柜 1#', type: '配电设备', area: 'A1 B1 配电房', online: '在线', status: '正常', health: 97, owner: '陈工', alarm: '无', telemetry: { voltage: 382.4, current: 126.2, temperature: 36.8 } },
      { id: 'DEV-HVAC-014', name: 'B2 冷却泵 P-02', type: '暖通设备', area: '能源站', online: '在线', status: '故障', health: 58, owner: '刘工', alarm: '轴温过高', telemetry: { pressure: 0.42, current: 46.8, temperature: 78.4 } },
      { id: 'DEV-FIR-032', name: 'B2-3F 烟感 032', type: '消防设备', area: 'B2 3F 西区', online: '在线', status: '告警', health: 72, owner: '消控室', alarm: '烟雾浓度超限', telemetry: { smoke: 18.4, temperature: 42.1 } },
      { id: 'DEV-CAM-118', name: '东门岗球机', type: '安防设备', area: '东入口', online: '在线', status: '正常', health: 91, owner: '安防班', alarm: '无', telemetry: { stream: 'normal', storage: 82 } },
      { id: 'DEV-ENV-045', name: 'C3 中庭 CO₂ 传感器', type: '环境设备', area: 'C3 1F 中庭', online: '离线', status: '离线', health: 41, owner: '王工', alarm: '数据中断', telemetry: { co2: 590, humidity: 55 } }
    ],
    alarms: [
      { id: 'ALM-20260602-018', type: '消防', level: '一级严重', source: 'B2-3F 烟感', location: 'B2 智造厂房 3F', status: '未确认', time: '09:42', action: '联动视频', description: '烟雾浓度超过消防告警阈值', deviceId: 'DEV-FIR-032' },
      { id: 'ALM-20260602-017', type: '设备', level: '二级紧急', source: '冷却泵 P-02', location: '能源站', status: '处理中', time: '09:31', action: '查看工单', description: '冷却泵轴温连续 5 分钟高于 75℃', deviceId: 'DEV-HVAC-014', workorderId: 'WO-260602-082' },
      { id: 'ALM-20260602-016', type: '能耗', level: '三级一般', source: 'A1 总表', location: 'A1 创新研发楼', status: '已确认', time: '09:18', action: '核查趋势', description: '非工作时间用电量高于历史均值 26%', deviceId: 'DEV-PD-001' },
      { id: 'ALM-20260602-015', type: '门禁', level: '三级一般', source: '东门岗', location: '园区东入口', status: '未确认', time: '09:08', action: '查看记录', description: '访客凭证连续验证失败', deviceId: 'DEV-CAM-118' }
    ],
    workorders: [
      { id: 'WO-260602-082', title: '冷却泵轴温异常核查', type: '设备故障', source: '系统告警', location: '能源站', priority: '紧急', status: '处理中', owner: '刘工', sla: '10:20', alarmId: 'ALM-20260602-017', createdAt: '2026-06-02T09:34:00+08:00' },
      { id: 'WO-260602-081', title: 'B2 3F 烟感告警确认', type: '消防告警', source: '告警中心', location: 'B2 3F', priority: '严重', status: '待处理', owner: '消控室', sla: '09:57', alarmId: 'ALM-20260602-018', createdAt: '2026-06-02T09:43:00+08:00' },
      { id: 'WO-260602-080', title: 'C3 中庭传感器离线', type: '环境异常', source: '系统告警', location: 'C3 1F', priority: '一般', status: '待派单', owner: '未分配', sla: '13:20', createdAt: '2026-06-02T09:20:00+08:00' },
      { id: 'WO-260602-079', title: 'A1 8F 会议室照明报修', type: '企业报修', source: '企业提交', location: 'A1 8F', priority: '一般', status: '待验收', owner: '赵工', sla: '明日 12:00', createdAt: '2026-06-02T08:45:00+08:00' }
    ],
    enterprises: [
      { id: 'ent-cloud', name: '云启智能科技', building: 'A1', rooms: '801-806', area: 1480, industry: '人工智能', status: '在驻', bill: '正常' },
      { id: 'ent-chip', name: '芯联微电子', building: 'B2', rooms: '301-318', area: 5260, industry: '半导体', status: '在驻', bill: '正常' },
      { id: 'ent-robot', name: '智衡机器人', building: 'C3', rooms: '501-508', area: 1860, industry: '机器人', status: '即将到期', bill: '正常' },
      { id: 'ent-green', name: '绿源储能', building: 'D4', rooms: '202-204', area: 920, industry: '新能源', status: '在驻', bill: '欠费' }
    ],
    rooms: [
      { id: 'room-a1-801', room: 'A1-801', building: 'A1', floor: 8, state: '已租', enterprise: '云启智能科技', area: '312㎡' },
      { id: 'room-a1-902', room: 'A1-902', building: 'A1', floor: 9, state: '空置', enterprise: '-', area: '286㎡' },
      { id: 'room-b2-308', room: 'B2-308', building: 'B2', floor: 3, state: '已租', enterprise: '芯联微电子', area: '620㎡' },
      { id: 'room-c3-602', room: 'C3-602', building: 'C3', floor: 6, state: '即将到期', enterprise: '智衡机器人', area: '260㎡' },
      { id: 'room-d4-203', room: 'D4-203', building: 'D4', floor: 2, state: '欠费异常', enterprise: '绿源储能', area: '310㎡' },
      { id: 'room-d4-501', room: 'D4-501', building: 'D4', floor: 5, state: '不可租', enterprise: '公共会议室', area: '180㎡' }
    ],
    environment: [
      { id: 'env-a1-lobby', name: 'A1 大堂', temp: 24.6, humidity: 58, pm25: 21, co2: 620, noise: 48, status: '正常' },
      { id: 'env-b2-corridor', name: 'B2 生产走廊', temp: 29.8, humidity: 69, pm25: 46, co2: 840, noise: 63, status: '预警' },
      { id: 'env-c3-atrium', name: 'C3 中庭', temp: 25.1, humidity: 55, pm25: 18, co2: 590, noise: 42, status: '离线' },
      { id: 'env-pump-room', name: '地下泵房', temp: 27.4, humidity: 81, pm25: 35, co2: 760, noise: 57, status: '告警' }
    ],
    energySeries: [
      { label: '00', energy: 660, alarms: 1, workorders: 2 },
      { label: '04', energy: 520, alarms: 2, workorders: 1 },
      { label: '08', energy: 1160, alarms: 5, workorders: 7 },
      { label: '12', energy: 1480, alarms: 4, workorders: 5 },
      { label: '16', energy: 1720, alarms: 8, workorders: 10 },
      { label: '20', energy: 1280, alarms: 3, workorders: 6 },
      { label: '24', energy: 780, alarms: 0, workorders: 3 }
    ],
    energyRanking: [
      { name: 'B2 智造厂房', value: 6350, percent: 100 },
      { name: 'A1 创新研发楼', value: 4280, percent: 67 },
      { name: 'C3 孵化中心', value: 3920, percent: 62 },
      { name: 'D4 配套服务楼', value: 2150, percent: 34 }
    ],
    energyOverview: {
      electricityToday: 18420,
      waterToday: 612,
      carbonToday: 11.7,
      energyPerSquareMeter: 0.42
    }
  };
}
