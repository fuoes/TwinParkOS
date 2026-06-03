import bcrypt from 'bcryptjs';

const hash = (value) => bcrypt.hashSync(value, 10);

export function createSeedData() {
  return {
    meta: {
      version: 2,
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
        permissions: ['dashboard:read', 'device:read', 'device:manage', 'energy:read', 'energy:manage', 'security:read', 'security:manage', 'environment:read', 'environment:manage', 'alarm:read', 'alarm:manage', 'workorder:read', 'workorder:manage', 'enterprise:read', 'enterprise:manage', 'space:read', 'space:manage', 'report:read']
      },
      {
        id: 'role-engineer',
        name: '物业运维人员',
        menus: ['dashboard', 'twin', 'devices', 'environment', 'workorders', 'alarms'],
        permissions: ['dashboard:read', 'device:read', 'device:manage', 'environment:read', 'alarm:read', 'workorder:read', 'workorder:manage']
      },
      {
        id: 'role-security',
        name: '安防值班人员',
        menus: ['dashboard', 'twin', 'security', 'workorders', 'alarms'],
        permissions: ['dashboard:read', 'security:read', 'security:manage', 'alarm:read', 'alarm:manage', 'workorder:read', 'workorder:manage']
      },
      {
        id: 'role-energy',
        name: '能源管理人员',
        menus: ['dashboard', 'twin', 'energy', 'environment', 'alarms', 'reports'],
        permissions: ['dashboard:read', 'energy:read', 'energy:manage', 'environment:read', 'alarm:read', 'alarm:manage', 'report:read']
      }
    ],
    users: [
      { id: 'user-admin', username: 'admin', name: '平台管理员', passwordHash: hash('admin123'), roleId: 'role-admin', department: '信息化管理部', enabled: true },
      { id: 'user-operator', username: 'operator', name: '运营中心', passwordHash: hash('operator123'), roleId: 'role-operator', department: '运营服务部', enabled: true },
      { id: 'user-engineer', username: 'engineer', name: '刘工', passwordHash: hash('engineer123'), roleId: 'role-engineer', department: '物业工程部', enabled: true },
      { id: 'user-security', username: 'security', name: '安防值班员', passwordHash: hash('security123'), roleId: 'role-security', department: '安防管理部', enabled: true },
      { id: 'user-energy', username: 'energy', name: '能源管理员', passwordHash: hash('energy123'), roleId: 'role-energy', department: '能源管理部', enabled: true }
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
      {
        id: 'WO-260602-082',
        title: '冷却泵轴温异常核查',
        type: '设备故障',
        source: '系统告警',
        location: '能源站',
        priority: '紧急',
        status: '处理中',
        owner: '刘工',
        sla: '10:20',
        alarmId: 'ALM-20260602-017',
        description: '冷却泵 P-02 轴温连续 5 分钟高于 75℃，需要现场检查润滑与散热状态。',
        createdAt: '2026-06-02T09:34:00+08:00',
        timeline: [
          { status: '待派单', user: '系统', time: '2026-06-02 09:34', note: '由设备高温告警自动生成' },
          { status: '待处理', user: '物业主管', time: '2026-06-02 09:36', note: '派单给刘工' },
          { status: '处理中', user: '刘工', time: '2026-06-02 09:40', note: '已到达能源站开始核查' }
        ]
      },
      {
        id: 'WO-260602-081',
        title: 'B2 3F 烟感告警确认',
        type: '消防告警',
        source: '告警中心',
        location: 'B2 3F',
        priority: '严重',
        status: '待处理',
        owner: '消控室',
        sla: '09:57',
        alarmId: 'ALM-20260602-018',
        description: 'B2 智造厂房 3F 西区烟感触发，需要联动视频并现场确认。',
        createdAt: '2026-06-02T09:43:00+08:00',
        timeline: [
          { status: '待派单', user: '系统', time: '2026-06-02 09:43', note: '由消防火警自动生成' },
          { status: '待处理', user: '安防值班员', time: '2026-06-02 09:44', note: '已派发至消控室' }
        ]
      },
      {
        id: 'WO-260602-080',
        title: 'C3 中庭传感器离线',
        type: '环境异常',
        source: '系统告警',
        location: 'C3 1F',
        priority: '一般',
        status: '待派单',
        owner: '未分配',
        sla: '13:20',
        description: 'C3 中庭 CO₂ 传感器超过一个采集周期未上报数据。',
        createdAt: '2026-06-02T09:20:00+08:00',
        timeline: [
          { status: '待派单', user: '系统', time: '2026-06-02 09:20', note: '由数据中断告警自动生成' }
        ]
      },
      {
        id: 'WO-260602-079',
        title: 'A1 8F 会议室照明报修',
        type: '企业报修',
        source: '企业提交',
        location: 'A1 8F',
        priority: '一般',
        status: '待验收',
        owner: '赵工',
        sla: '明日 12:00',
        description: 'A1 8F 会议室部分照明无法开启。',
        result: '已更换故障驱动电源，照明恢复正常。',
        createdAt: '2026-06-02T08:45:00+08:00',
        timeline: [
          { status: '待派单', user: '云启智能科技', time: '2026-06-02 08:45', note: '企业提交报修' },
          { status: '待处理', user: '物业主管', time: '2026-06-02 08:50', note: '派单给赵工' },
          { status: '处理中', user: '赵工', time: '2026-06-02 09:05', note: '已到场检查照明回路' },
          { status: '待验收', user: '赵工', time: '2026-06-02 09:35', note: '维修完成，等待企业验收' }
        ]
      }
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
    },
    inspections: [
      { id: 'INS-260603-001', name: '配电房日常巡检', object: 'A1 配电设备', area: 'A1 B1 配电房', cycle: '每日', owner: '陈工', status: '进行中', nextRun: '今日 16:00', completion: 68 },
      { id: 'INS-260603-002', name: '消防设施月度巡检', object: '烟感、消防栓', area: 'B2 智造厂房', cycle: '每月', owner: '消控室', status: '未开始', nextRun: '06-05 09:00', completion: 0 },
      { id: 'INS-260603-003', name: '环境传感器巡检', object: '环境设备', area: '全园区', cycle: '每周', owner: '王工', status: '已完成', nextRun: '06-10 10:00', completion: 100 }
    ],
    maintenancePlans: [
      { id: 'MNT-260603-001', name: '冷却泵季度保养', device: 'B2 冷却泵 P-02', cycle: '每季度', owner: '刘工', dueDate: '2026-06-12', status: '待执行' },
      { id: 'MNT-260603-002', name: '电梯半年度维保', device: 'A1 客梯 1#', cycle: '每半年', owner: '维保单位', dueDate: '2026-06-20', status: '待执行' },
      { id: 'MNT-260603-003', name: '摄像头清洁保养', device: '园区摄像头', cycle: '每月', owner: '安防班', dueDate: '2026-06-08', status: '进行中' }
    ],
    energyBills: [
      { id: 'BILL-2605-001', enterprise: '云启智能科技', period: '2026-05', electricity: 12840, water: 186, amount: 14620, paid: 14620, status: '已支付' },
      { id: 'BILL-2605-002', enterprise: '芯联微电子', period: '2026-05', electricity: 28640, water: 412, amount: 32880, paid: 32880, status: '已支付' },
      { id: 'BILL-2605-003', enterprise: '智衡机器人', period: '2026-05', electricity: 16220, water: 205, amount: 18360, paid: 0, status: '待支付' },
      { id: 'BILL-2605-004', enterprise: '绿源储能', period: '2026-05', electricity: 11280, water: 138, amount: 12940, paid: 4000, status: '部分支付' }
    ],
    cameras: [
      { id: 'CAM-001', name: '东门岗球机', area: '园区东入口', online: '在线', stream: '正常', storage: '正常', preset: '入口全景' },
      { id: 'CAM-002', name: 'B2 厂房西侧', area: 'B2 西侧道路', online: '在线', stream: '正常', storage: '正常', preset: '周界' },
      { id: 'CAM-003', name: 'A1 大堂', area: 'A1 1F 大堂', online: '在线', stream: '正常', storage: '正常', preset: '大堂' },
      { id: 'CAM-004', name: '能源站', area: '能源站', online: '在线', stream: '正常', storage: '正常', preset: '设备区' }
    ],
    accessRecords: [
      { id: 'ACC-260603-001', person: '张立', enterprise: '云启智能科技', gate: '东门岗', direction: '入园', time: '08:42', result: '通过' },
      { id: 'ACC-260603-002', person: '李敏', enterprise: '芯联微电子', gate: 'B2 南门', direction: '入楼', time: '08:46', result: '通过' },
      { id: 'ACC-260603-003', person: '未知访客', enterprise: '-', gate: '东门岗', direction: '入园', time: '09:08', result: '拒绝' }
    ],
    vehicles: [
      { id: 'VEH-001', plate: '粤B·A1234', owner: '云启智能科技', type: '固定车辆', entryTime: '08:31', status: '在园', parking: 'P1-028' },
      { id: 'VEH-002', plate: '粤B·C6688', owner: '芯联微电子', type: '固定车辆', entryTime: '08:36', status: '在园', parking: 'P1-106' },
      { id: 'VEH-003', plate: '粤A·V2031', owner: '访客车辆', type: '临时车辆', entryTime: '09:12', status: '在园', parking: 'P2-018' }
    ],
    visitors: [
      { id: 'VIS-260603-001', name: '王先生', phone: '138****1024', enterprise: '云启智能科技', visitTime: '2026-06-03 10:00', reason: '商务洽谈', plate: '粤A·V2031', status: '已入园' },
      { id: 'VIS-260603-002', name: '赵女士', phone: '139****6672', enterprise: '智衡机器人', visitTime: '2026-06-03 14:00', reason: '项目交流', plate: '-', status: '待到访' },
      { id: 'VIS-260603-003', name: '陈先生', phone: '136****9811', enterprise: '芯联微电子', visitTime: '2026-06-04 09:30', reason: '设备交付', plate: '粤B·D8890', status: '待审批' }
    ],
    environmentThresholds: [
      { id: 'THR-TEMP', metric: '温度', warning: '> 30℃', alarm: '> 35℃', enabled: true },
      { id: 'THR-CO2', metric: 'CO₂', warning: '> 1000 ppm', alarm: '> 1500 ppm', enabled: true },
      { id: 'THR-PM25', metric: 'PM2.5', warning: '> 75 μg/m³', alarm: '> 115 μg/m³', enabled: true },
      { id: 'THR-NOISE', metric: '噪声', warning: '> 65 dB', alarm: '> 75 dB', enabled: true }
    ],
    serviceRequests: [
      { id: 'SR-260603-001', enterprise: '云启智能科技', type: '会议室预约', title: 'A1 多功能会议室预约', applicant: '张立', status: '已通过', createdAt: '2026-06-03 08:40' },
      { id: 'SR-260603-002', enterprise: '智衡机器人', type: '装修申请', title: 'C3 602 展厅改造', applicant: '李经理', status: '待审批', createdAt: '2026-06-03 09:16' },
      { id: 'SR-260603-003', enterprise: '绿源储能', type: '网络开通', title: 'D4 203 专线开通', applicant: '周工', status: '处理中', createdAt: '2026-06-03 09:28' }
    ],
    announcements: [
      { id: 'ANN-260603-001', title: '园区夏季消防安全检查通知', category: '安全通知', audience: '全园区', publishAt: '2026-06-03 08:00', status: '已发布', readRate: '86%' },
      { id: 'ANN-260602-002', title: 'A1 楼宇计划停电通知', category: '停水停电', audience: 'A1 企业', publishAt: '2026-06-02 16:30', status: '已发布', readRate: '94%' }
    ],
    contracts: [
      { id: 'CT-2025-001', enterprise: '云启智能科技', rooms: 'A1 801-806', area: 1480, startDate: '2025-01-01', endDate: '2027-12-31', rent: 68, propertyFee: 8, status: '执行中' },
      { id: 'CT-2024-016', enterprise: '芯联微电子', rooms: 'B2 301-318', area: 5260, startDate: '2024-07-01', endDate: '2028-06-30', rent: 52, propertyFee: 6, status: '执行中' },
      { id: 'CT-2024-027', enterprise: '智衡机器人', rooms: 'C3 501-508', area: 1860, startDate: '2024-09-01', endDate: '2026-08-31', rent: 62, propertyFee: 7, status: '即将到期' }
    ],
    alarmRules: [
      { id: 'RULE-FIRE-001', name: '消防火警联动', source: '消防设备', condition: '烟感或温感触发', level: '一级严重', actions: '三维定位、视频联动、生成工单', enabled: true },
      { id: 'RULE-HVAC-001', name: '冷却泵高温告警', source: '暖通设备', condition: '轴温 > 75℃ 持续 5 分钟', level: '二级紧急', actions: '通知物业、生成工单', enabled: true },
      { id: 'RULE-ENERGY-001', name: '非工作时间高能耗', source: '能耗表计', condition: '高于历史均值 20%', level: '三级一般', actions: '通知能源管理员', enabled: true }
    ],
    dataDictionaries: [
      { id: 'DICT-DEVICE-001', category: '设备类型', code: 'power_distribution', label: '配电设备', value: '配电设备', enabled: true },
      { id: 'DICT-ALARM-001', category: '告警等级', code: 'level_1', label: '一级严重', value: '一级严重', enabled: true },
      { id: 'DICT-WO-001', category: '工单状态', code: 'processing', label: '处理中', value: '处理中', enabled: true },
      { id: 'DICT-SPACE-001', category: '空间状态', code: 'leased', label: '已租', value: '已租', enabled: true }
    ],
    integrations: [
      { id: 'INT-MQTT-001', name: '虚拟 MQTT 设备网关', type: 'MQTT', mode: '虚拟仿真', status: '在线', endpoint: 'mqtt://virtual-broker/twinpark', lastSync: '实时' },
      { id: 'INT-VIDEO-001', name: '虚拟视频平台', type: 'GB28181', mode: '虚拟仿真', status: '在线', endpoint: 'virtual://video-platform', lastSync: '实时' },
      { id: 'INT-ACCESS-001', name: '虚拟门禁平台', type: 'HTTP API', mode: '虚拟仿真', status: '在线', endpoint: 'virtual://access-control', lastSync: '实时' }
    ],
    auditLogs: [
      { id: 'LOG-001', user: '平台管理员', action: '登录系统', module: '认证', detail: '管理员登录运营中心', time: '2026-06-03 08:30' },
      { id: 'LOG-002', user: '运营中心', action: '查看驾驶舱', module: '首页', detail: '查看园区运行态势', time: '2026-06-03 08:35' }
    ],
    simulator: {
      enabled: true,
      speed: 1,
      autoAlarm: false,
      scenario: '日常运营',
      lastScenarioAt: null
    }
  };
}
