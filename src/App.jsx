import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CloudSun,
  Cpu,
  Database,
  DoorOpen,
  Download,
  Eye,
  Factory,
  FileBarChart,
  FileText,
  Flame,
  Gauge,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  LogOut,
  Map,
  MapPinned,
  Maximize2,
  Menu,
  MonitorCog,
  Plus,
  Play,
  RadioTower,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Thermometer,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Zap
} from 'lucide-react';
import {
  buildingStats,
  devices,
  energyRanking,
  energyOverview,
  energyBills,
  enterprises,
  environmentPoints,
  environmentThresholds,
  inspections,
  kpis,
  maintenancePlans,
  navItems,
  cameras,
  accessRecords,
  vehicles,
  visitors,
  serviceRequests,
  announcements,
  contracts,
  alarmRules,
  dataDictionaries,
  integrations,
  auditLogs,
  systemUsers,
  systemRoles,
  simulatorState,
  realtimeAlarms,
  roomAssets,
  trendData,
  workorders,
  applyRealtimeEvent,
  hydrateData
} from './data.js';
import {
  acknowledgeAlarm,
  clearToken,
  closeAlarm,
  connectRealtime,
  controlDevice,
  createResource,
  createRole,
  createUser,
  createAlarmWorkorder,
  createWorkorder,
  deleteResource,
  deleteRole,
  deleteUser,
  downloadReport,
  getBootstrap,
  getMe,
  getToken,
  login,
  resetDemo,
  runScenario,
  simulateAlarm,
  updateResource,
  updateRole,
  updateSimulator,
  updateUser,
  updateWorkorder
} from './api.js';

const AppRuntimeContext = React.createContext(null);

function useRuntime() {
  return React.useContext(AppRuntimeContext);
}

const navIcons = {
  dashboard: LayoutDashboard,
  twin: Map,
  devices: Wrench,
  energy: Zap,
  security: Shield,
  environment: CloudSun,
  workorders: ClipboardList,
  enterprise: Users,
  space: Building2,
  alarms: Bell,
  reports: BarChart3,
  system: Settings
};

const layerDefaults = {
  building: true,
  device: true,
  energy: true,
  security: true,
  environment: true,
  alarm: true,
  enterprise: false
};

function App() {
  const [active, setActive] = useState('dashboard');
  const [selected, setSelected] = useState(buildingStats[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layers, setLayers] = useState(layerDefaults);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState('offline');
  const [toast, setToast] = useState(null);
  const [, setRevision] = useState(0);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !user?.menus?.length || user.menus.includes(item.id)),
    [user]
  );
  const activeItem = navItems.find((item) => item.id === active);

  const refreshData = useCallback(async () => {
    const payload = await getBootstrap();
    hydrateData(payload);
    setSelected((current) => buildingStats.find((item) => item.id === current?.id) || buildingStats[0]);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return;
    }
    Promise.all([getMe(), getBootstrap()])
      .then(([currentUser, payload]) => {
        hydrateData(payload);
        setUser(currentUser);
        setSelected(buildingStats[0]);
      })
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    return connectRealtime((event) => {
      if (event.type === 'telemetry:update') {
        applyRealtimeEvent(event);
        setRevision((value) => value + 1);
        return;
      }
      if (event.type !== 'realtime:ready') {
        refreshData().catch(() => {});
      }
    }, setRealtimeStatus);
  }, [refreshData, user]);

  async function handleLogin(username, password) {
    const nextUser = await login(username, password);
    await refreshData();
    setUser(nextUser);
    setSelected(buildingStats[0]);
  }

  function handleLogout() {
    clearToken();
    setRealtimeStatus('offline');
    setUser(null);
  }

  const notify = useCallback((message, tone = 'good') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const perform = useCallback(async (action, successMessage = '操作成功') => {
    try {
      const result = await action();
      await refreshData();
      notify(successMessage);
      return result;
    } catch (error) {
      notify(error.message, 'danger');
      return null;
    }
  }, [notify, refreshData]);

  const runtime = useMemo(() => ({ user, refreshData, perform, notify }), [user, refreshData, perform, notify]);

  if (booting) return <LoadingScreen />;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <AppRuntimeContext.Provider value={runtime}>
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Factory size={22} />
          </div>
          <div>
            <strong>TwinParkOS</strong>
            <span>数字孪生管控平台</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="关闭菜单">
            <X size={18} />
          </button>
        </div>
        <nav className="nav-list">
          {['总览', '运营', '服务', '治理'].map((group) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {visibleNavItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = navIcons[item.id];
                  return (
                    <button
                      key={item.id}
                      className={`nav-item ${active === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setActive(item.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main-frame">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="打开菜单">
            <Menu size={20} />
          </button>
          <div>
            <p className="breadcrumb">
              科创产业园 <ChevronRight size={14} /> {activeItem?.label}
            </p>
            <h1>{activeItem?.label}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input placeholder="搜索企业、设备、房间、告警" />
            </label>
            <StatusPill icon={CloudSun} label="26℃ 多云" />
            <StatusPill icon={Bell} label={`${realtimeAlarms.length} 条告警`} tone="warn" />
            <StatusPill
              icon={realtimeStatus === 'online' ? Wifi : WifiOff}
              label={realtimeStatus === 'online' ? '实时在线' : '实时离线'}
              tone={realtimeStatus === 'online' ? 'online' : 'offline'}
            />
            <button className="icon-button" aria-label="全屏">
              <Maximize2 size={18} />
            </button>
            <div className="user-chip">
              <UserRound size={17} />
              <span>{user.name}</span>
            </div>
            <button className="icon-button" onClick={handleLogout} aria-label="退出登录" title="退出登录">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className={`content ${active === 'twin' ? 'content-twin' : ''}`}>
          {active === 'dashboard' && <DashboardPage setActive={setActive} setSelected={setSelected} />}
          {active === 'twin' && (
            <TwinPage
              layers={layers}
              setLayers={setLayers}
              selected={selected}
              setSelected={setSelected}
              setActive={setActive}
            />
          )}
          {active === 'devices' && <DevicesPage />}
          {active === 'energy' && <EnergyPage />}
          {active === 'security' && <SecurityPage />}
          {active === 'environment' && <EnvironmentPage />}
          {active === 'workorders' && <WorkOrdersPage />}
          {active === 'enterprise' && <EnterprisePage />}
          {active === 'space' && <SpacePage />}
          {active === 'alarms' && (
            <AlarmsPage
              setActive={setActive}
              onSimulate={() => perform(simulateAlarm, '已生成虚拟告警')}
              onAcknowledge={(alarmId) => perform(() => acknowledgeAlarm(alarmId), '告警已确认')}
              onCreateOrder={(alarmId) => perform(() => createAlarmWorkorder(alarmId), '已生成关联工单')}
              onClose={(alarmId) => perform(() => closeAlarm(alarmId), '告警已关闭')}
            />
          )}
          {active === 'reports' && <ReportsPage />}
          {active === 'system' && <SystemPage />}
        </main>
      </div>
    </div>
    {toast && <div className={`toast ${toast.tone}`}>{toast.message}</div>}
    </AppRuntimeContext.Provider>
  );
}

function StatusPill({ icon: Icon, label, tone }) {
  return (
    <div className={`status-pill ${tone || ''}`}>
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <LoaderCircle size={34} />
      <span>正在连接园区运营中心...</span>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand-mark">
          <Factory size={25} />
        </div>
        <p className="eyebrow">TwinParkOS</p>
        <h1>智慧产业园区数字孪生<br />可视化管控平台</h1>
        <p>设备状态、告警事件与物业工单在一个空间入口中联动。</p>
        <div className="login-signals">
          <span><RadioTower size={16} /> 1,284 台在线设备</span>
          <span><Shield size={16} /> 7×24 小时态势感知</span>
          <span><Activity size={16} /> 实时数据推送</span>
        </div>
      </section>
      <form className="login-form" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">身份认证</p>
          <h2>登录运营中心</h2>
          <span>请使用园区管理账号进入系统</span>
        </div>
        <label>
          <span>用户名</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button className="primary-action" type="submit" disabled={submitting}>
          {submitting ? <LoaderCircle className="spin" size={17} /> : <Lock size={17} />}
          {submitting ? '正在登录' : '登录平台'}
        </button>
        <p className="login-hint">演示账号：admin / admin123</p>
      </form>
    </div>
  );
}

function DashboardPage({ setActive, setSelected }) {
  return (
    <div className="dashboard-layout">
      <section className="hero-band">
        <div>
          <p className="eyebrow">园区运行态势</p>
          <h2>空间、设备、告警、工单一屏联动</h2>
        </div>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => setActive('twin')}>
            <MapPinned size={17} /> 进入三维一张图
          </button>
          <button className="ghost-action" onClick={() => setActive('alarms')}>
            <ShieldAlert size={17} /> 今日告警
          </button>
        </div>
      </section>

      <section className="kpi-grid">
        {kpis.map((item) => (
          <button className={`kpi-card ${item.tone}`} key={item.label} onClick={() => setActive(item.target)}>
            <span>{item.label}</span>
            <strong>
              {item.value}
              <small>{item.unit}</small>
            </strong>
            <em>{item.delta}</em>
          </button>
        ))}
      </section>

      <section className="dashboard-main">
        <div className="panel panel-large">
          <PanelTitle icon={MapPinned} title="园区空间总览" action="楼栋详情" />
          <ParkMiniMap
            onSelect={(building) => {
              setSelected(building);
              setActive('twin');
            }}
          />
        </div>
        <div className="panel">
          <PanelTitle icon={AlertTriangle} title="实时告警" action="全部" />
          <AlarmList compact />
        </div>
        <div className="panel">
          <PanelTitle icon={ClipboardList} title="待办工单" action="派单" />
          <WorkorderMiniList />
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel">
          <PanelTitle icon={Zap} title="今日能耗趋势" action="报表" />
          <TrendChart mode="energy" />
        </div>
        <div className="panel">
          <PanelTitle icon={Gauge} title="设备健康排行" action="监控" />
          <HealthRanking />
        </div>
        <div className="panel">
          <PanelTitle icon={BarChart3} title="运营闭环趋势" action="分析" />
          <TrendChart mode="mixed" />
        </div>
      </section>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, action }) {
  return (
    <div className="panel-title">
      <div>
        <Icon size={18} />
        <h3>{title}</h3>
      </div>
      {action && <button>{action}</button>}
    </div>
  );
}

function ParkMiniMap({ onSelect }) {
  return (
    <div className="park-map">
      <div className="road road-main" />
      <div className="road road-cross" />
      {buildingStats.map((building, index) => (
        <button
          className={`map-building b-${index}`}
          key={building.name}
          onClick={() => onSelect(building)}
          style={{
            '--height': `${54 + building.floors * 4}px`,
            '--occupancy': `${building.occupancy}%`
          }}
        >
          <span>{building.name.split(' ')[0]}</span>
          <strong>{building.occupancy}%</strong>
        </button>
      ))}
      <div className="map-point alarm-point">火警</div>
      <div className="map-point camera-point">视频</div>
      <div className="map-point energy-point">能耗</div>
    </div>
  );
}

function AlarmList({ compact = false, onAcknowledge, onCreateOrder, onClose }) {
  return (
    <div className="stack-list">
      {realtimeAlarms.slice(0, compact ? 4 : realtimeAlarms.length).map((alarm) => (
        <div className="list-row alarm-row" key={alarm.id}>
          <div className={`level-dot ${alarm.level.includes('一级') ? 'danger' : alarm.level.includes('二级') ? 'warn' : 'info'}`} />
          <div>
            <strong>{alarm.type} · {alarm.source}</strong>
            <span>{alarm.location} · {alarm.time} · {alarm.status}</span>
          </div>
          {compact ? (
            <button>{alarm.action}</button>
          ) : (
            <div className="row-actions">
              <button onClick={() => onAcknowledge?.(alarm.id)} disabled={alarm.status === '已确认'}>确认</button>
              <button onClick={() => onCreateOrder?.(alarm.id)}>生成工单</button>
              <button onClick={() => onClose?.(alarm.id)} disabled={alarm.status === '已关闭'}>关闭</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WorkorderMiniList() {
  return (
    <div className="stack-list">
      {workorders.map((item) => (
        <div className="list-row" key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.location} · {item.priority} · SLA {item.sla}</span>
          </div>
          <Badge value={item.status} />
        </div>
      ))}
    </div>
  );
}

function TrendChart({ mode = 'energy' }) {
  const maxEnergy = Math.max(...trendData.map((item) => item.energy));
  const maxOther = Math.max(...trendData.map((item) => item.alarms + item.workorders));
  return (
    <div className="trend-chart">
      {trendData.map((item) => {
        const energyHeight = (item.energy / maxEnergy) * 100;
        const otherHeight = ((item.alarms + item.workorders) / maxOther) * 100;
        return (
          <div className="trend-col" key={item.label}>
            <div className="bars">
              <span className="bar energy" style={{ height: `${energyHeight}%` }} />
              {mode === 'mixed' && <span className="bar event" style={{ height: `${otherHeight}%` }} />}
            </div>
            <small>{item.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function HealthRanking() {
  return (
    <div className="ranking">
      {buildingStats
        .slice()
        .sort((a, b) => b.health - a.health)
        .map((item) => (
          <div key={item.name}>
            <span>{item.name}</span>
            <div className="progress">
              <i style={{ width: `${item.health}%` }} />
            </div>
            <strong>{item.health}</strong>
          </div>
        ))}
    </div>
  );
}

function TwinPage({ layers, setLayers, selected, setSelected, setActive }) {
  return (
    <div className="twin-page">
      <div className="scene-toolbar">
        <button onClick={() => setActive('dashboard')}>
          <Home size={16} /> 返回首页
        </button>
        <button>
          <Layers size={16} /> 图层控制
        </button>
        <button>
          <Search size={16} /> 搜索定位
        </button>
        <button>
          <MonitorCog size={16} /> 夜间模式
        </button>
      </div>

      <div className="layer-panel">
        <h3>图层</h3>
        {[
          ['building', '建筑图层', Building2],
          ['device', '设备图层', Cpu],
          ['energy', '能耗图层', Zap],
          ['security', '安防图层', Shield],
          ['environment', '环境图层', Thermometer],
          ['alarm', '告警图层', Bell],
          ['enterprise', '企业图层', Users]
        ].map(([key, label, Icon]) => (
          <label className="layer-toggle" key={key}>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}
            />
            <Icon size={16} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <ThreeParkScene layers={layers} onSelect={setSelected} />

      <aside className="object-panel">
        <p className="eyebrow">选中对象</p>
        <h2>{selected?.name || 'A1 创新研发楼'}</h2>
        <div className="object-grid">
          <Metric label="入驻企业" value={selected?.enterprises || 28} unit="家" />
          <Metric label="出租率" value={selected?.occupancy || 94} unit="%" />
          <Metric label="今日能耗" value={selected?.energy || 4280} unit="kWh" />
          <Metric label="健康评分" value={selected?.health || 96} unit="分" />
        </div>
        <div className="detail-block">
          <h3>实时状态</h3>
          <p>设备在线率稳定，公共区域环境舒适。B2 厂房存在消防与暖通异常，需要优先联动处置。</p>
        </div>
        <div className="detail-actions">
          <button onClick={() => setActive('devices')}>
            <Eye size={16} /> 查看设备
          </button>
          <button onClick={() => setActive('energy')}>
            <Zap size={16} /> 查看能耗
          </button>
          <button onClick={() => setActive('workorders')}>
            <Send size={16} /> 生成工单
          </button>
        </div>
      </aside>

      <div className="timeline-panel">
        <span>00:00</span>
        <div className="timeline">
          <i style={{ left: '18%' }} />
          <i style={{ left: '52%' }} />
          <i style={{ left: '73%' }} />
        </div>
        <span>24:00</span>
      </div>
    </div>
  );
}

function ThreeParkScene({ layers, onSelect }) {
  const hostRef = useRef(null);
  const sceneStateRef = useRef(null);
  const layersRef = useRef(layers);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    layersRef.current = layers;
    const state = sceneStateRef.current;
    if (!state) return;
    state.groups.device.visible = layers.device;
    state.groups.energy.visible = layers.energy;
    state.groups.security.visible = layers.security;
    state.groups.environment.visible = layers.environment;
    state.groups.alarm.visible = layers.alarm;
    state.groups.enterprise.visible = layers.enterprise;
    state.groups.building.visible = layers.building;
  }, [layers]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101720');
    scene.fog = new THREE.Fog('#101720', 26, 92);

    const camera = new THREE.PerspectiveCamera(48, host.clientWidth / host.clientHeight, 0.1, 200);
    camera.position.set(26, 24, 32);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight('#dff7ff', '#334047', 1.6);
    const keyLight = new THREE.DirectionalLight('#ffffff', 2);
    keyLight.position.set(12, 20, 10);
    scene.add(ambient, keyLight);

    const grid = new THREE.GridHelper(52, 26, '#304759', '#20313f');
    grid.position.y = 0.02;
    scene.add(grid);

    const groups = {
      building: new THREE.Group(),
      device: new THREE.Group(),
      energy: new THREE.Group(),
      security: new THREE.Group(),
      environment: new THREE.Group(),
      alarm: new THREE.Group(),
      enterprise: new THREE.Group()
    };
    Object.values(groups).forEach((group) => scene.add(group));

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(54, 0.28, 38),
      new THREE.MeshStandardMaterial({ color: '#162a31', roughness: 0.75 })
    );
    ground.position.y = -0.15;
    scene.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: '#2f3438', roughness: 0.85 });
    const roadA = new THREE.Mesh(new THREE.BoxGeometry(50, 0.08, 3.8), roadMaterial);
    roadA.position.set(0, 0.04, 0);
    const roadB = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 36), roadMaterial);
    roadB.position.set(-4, 0.05, 0);
    scene.add(roadA, roadB);

    const buildingMeshes = [];
    const buildingPositions = [
      [-16, 0, -8],
      [8, 0, -9],
      [-14, 0, 9],
      [11, 0, 8]
    ];
    const buildingColors = ['#5fc8d4', '#f0bd57', '#7ddf91', '#d989c4'];

    buildingStats.forEach((building, index) => {
      const height = 3 + building.floors * 0.72;
      const position = buildingPositions[index] || [((index % 3) - 1) * 11, 0, (Math.floor(index / 3) - 1) * 11];
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, height, 7),
        new THREE.MeshStandardMaterial({
          color: buildingColors[index % buildingColors.length],
          roughness: 0.45,
          metalness: 0.08,
          transparent: true,
          opacity: 0.88
        })
      );
      mesh.position.set(position[0], height / 2, position[2]);
      mesh.userData = { building };
      groups.building.add(mesh);
      buildingMeshes.push(mesh);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.18, 7.7),
        new THREE.MeshStandardMaterial({ color: '#e6f6f6', roughness: 0.4 })
      );
      roof.position.set(mesh.position.x, height + 0.12, mesh.position.z);
      groups.building.add(roof);

      for (let floor = 1; floor < building.floors; floor += 1) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(7.7, 0.035, 7.2),
          new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 })
        );
        line.position.set(mesh.position.x, floor * 0.72, mesh.position.z);
        groups.building.add(line);
      }
    });

    const pointSpecs = [
      { group: 'device', color: '#6ee7b7', pos: [-18, 6.8, -5], size: 0.36 },
      { group: 'device', color: '#6ee7b7', pos: [9, 4.5, -5], size: 0.36 },
      { group: 'energy', color: '#facc15', pos: [-10, 0.9, 1], size: 0.32 },
      { group: 'security', color: '#60a5fa', pos: [17, 1, -2], size: 0.34 },
      { group: 'environment', color: '#a78bfa', pos: [-13, 5, 13], size: 0.32 },
      { group: 'alarm', color: '#ef4444', pos: [8, 5.8, -9], size: 0.46 }
    ];

    pointSpecs.forEach((point) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(point.size, 24, 24),
        new THREE.MeshStandardMaterial({ color: point.color, emissive: point.color, emissiveIntensity: 0.6 })
      );
      marker.position.set(...point.pos);
      groups[point.group].add(marker);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(point.size * 1.8, 0.018, 10, 36),
        new THREE.MeshBasicMaterial({ color: point.color, transparent: true, opacity: 0.7 })
      );
      ring.position.set(point.pos[0], point.pos[1] - 0.04, point.pos[2]);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { pulse: true };
      groups[point.group].add(ring);
    });

    const enterpriseGlow = new THREE.Mesh(
      new THREE.CircleGeometry(8.4, 42),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.13 })
    );
    enterpriseGlow.position.set(-16, 0.08, -8);
    enterpriseGlow.rotation.x = -Math.PI / 2;
    groups.enterprise.add(enterpriseGlow);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const drag = { active: false, x: 0, y: 0, yaw: 0.68, pitch: 0.62, radius: 48 };

    const updateCamera = () => {
      const x = Math.sin(drag.yaw) * drag.radius;
      const z = Math.cos(drag.yaw) * drag.radius;
      const y = Math.sin(drag.pitch) * drag.radius * 0.66 + 8;
      camera.position.set(x, y, z);
      camera.lookAt(0, 2.8, 0);
    };
    updateCamera();

    const handlePointerDown = (event) => {
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
    };
    const handlePointerMove = (event) => {
      if (!drag.active) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.yaw -= dx * 0.006;
      drag.pitch = Math.max(0.24, Math.min(1.08, drag.pitch + dy * 0.004));
      updateCamera();
    };
    const handlePointerUp = () => {
      drag.active = false;
    };
    const handleWheel = (event) => {
      event.preventDefault();
      drag.radius = Math.max(24, Math.min(72, drag.radius + event.deltaY * 0.035));
      updateCamera();
    };
    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(buildingMeshes, false)[0];
      if (hit?.object?.userData?.building) {
        onSelectRef.current(hit.object.userData.building);
      }
    };
    const handleResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    sceneStateRef.current = { groups };
    Object.entries(layersRef.current).forEach(([key, visible]) => {
      if (groups[key]) groups[key].visible = visible;
    });

    let frameId;
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      groups.alarm.children.forEach((child) => {
        child.scale.setScalar(1 + Math.sin(time * 4) * 0.18);
      });
      Object.values(groups).forEach((group) => {
        group.children.forEach((child) => {
          if (child.userData?.pulse) child.rotation.z = time * 1.4;
        });
      });
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      host.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, []);

  return <div className="three-host" ref={hostRef} aria-label="三维园区数字孪生场景" />;
}

function Metric({ label, value, unit }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}

function DevicesPage() {
  const { perform } = useRuntime();
  const [tab, setTab] = useState('devices');
  const online = devices.filter((item) => item.online === '在线').length;
  const faulty = devices.filter((item) => ['故障', '告警', '离线'].includes(item.status)).length;
  const averageHealth = devices.length ? (devices.reduce((sum, item) => sum + Number(item.health || 0), 0) / devices.length).toFixed(1) : 0;
  return (
    <ModuleScaffold
      title="设备全生命周期运维"
      intro="虚拟设备台账、实时状态、巡检维保、故障告警和健康评分集中管理。"
      actions={[
        { label: '恢复全部设备', icon: RotateCcw, onClick: () => perform(() => runScenario('normal'), '全部虚拟设备已恢复') },
        { label: '模拟设备故障', icon: AlertTriangle, onClick: () => perform(() => runScenario('pump-fault'), '已触发冷却泵故障场景') }
      ]}
    >
      <section className="summary-grid">
        <SummaryCard icon={Cpu} label="虚拟设备总数" value={devices.length} tone="cyan" />
        <SummaryCard icon={RadioTower} label="在线设备" value={online} tone="green" />
        <SummaryCard icon={AlertTriangle} label="异常设备" value={faulty} tone="red" />
        <SummaryCard icon={Gauge} label="平均健康度" value={`${averageHealth}%`} tone="violet" />
      </section>
      <TabStrip
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'devices', label: '设备台账', count: devices.length },
          { id: 'inspections', label: '巡检计划', count: inspections.length },
          { id: 'maintenance', label: '维保计划', count: maintenancePlans.length },
          { id: 'simulator', label: '虚拟仿真器' }
        ]}
      />
      {tab === 'devices' && (
        <ResourceManager
          title="设备台账"
          icon={Wrench}
          resource="devices"
          items={devices}
          columns={[
            { key: 'id', label: '设备编号' },
            { key: 'name', label: '设备名称' },
            { key: 'type', label: '类型' },
            { key: 'area', label: '位置' },
            { key: 'online', label: '在线状态', render: (value) => <Badge value={value} /> },
            { key: 'status', label: '运行状态', render: (value) => <Badge value={value} /> },
            { key: 'health', label: '健康评分' },
            { key: 'owner', label: '责任人' }
          ]}
          fields={[
            { key: 'id', label: '设备编号', required: true },
            { key: 'name', label: '设备名称', required: true },
            { key: 'type', label: '设备类型', type: 'select', options: ['配电设备', '暖通设备', '消防设备', '安防设备', '环境设备'], required: true },
            { key: 'area', label: '所属位置', required: true },
            { key: 'online', label: '在线状态', type: 'select', options: ['在线', '离线'], defaultValue: '在线' },
            { key: 'status', label: '运行状态', type: 'select', options: ['正常', '停止', '故障', '告警', '离线'], defaultValue: '正常' },
            { key: 'health', label: '健康评分', type: 'number', defaultValue: 90 },
            { key: 'owner', label: '责任人', required: true },
            { key: 'alarm', label: '当前异常', defaultValue: '无' }
          ]}
          extraActions={(item) => (
            <>
              <button onClick={() => perform(() => controlDevice(item.id, 'recover'), '设备已恢复')}>恢复</button>
              <button onClick={() => perform(() => controlDevice(item.id, 'fault', '虚拟故障'), '已触发虚拟故障')}>故障</button>
              <button onClick={() => perform(() => controlDevice(item.id, 'offline'), '设备已模拟离线')}>离线</button>
            </>
          )}
        />
      )}
      {tab === 'inspections' && (
        <ResourceManager
          title="巡检计划"
          icon={ClipboardList}
          resource="inspections"
          items={inspections}
          columns={[
            { key: 'id', label: '计划编号' }, { key: 'name', label: '计划名称' }, { key: 'object', label: '巡检对象' },
            { key: 'area', label: '区域' }, { key: 'cycle', label: '周期' }, { key: 'owner', label: '执行人' },
            { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }, { key: 'completion', label: '完成率' }
          ]}
          fields={[
            { key: 'name', label: '计划名称', required: true }, { key: 'object', label: '巡检对象', required: true },
            { key: 'area', label: '巡检区域', required: true }, { key: 'cycle', label: '巡检周期', type: 'select', options: ['每日', '每周', '每月', '每季度'], required: true },
            { key: 'owner', label: '执行人', required: true }, { key: 'status', label: '状态', type: 'select', options: ['未开始', '进行中', '已完成', '已逾期'], defaultValue: '未开始' },
            { key: 'nextRun', label: '下次执行时间' }, { key: 'completion', label: '完成率', type: 'number', defaultValue: 0 }
          ]}
        />
      )}
      {tab === 'maintenance' && (
        <ResourceManager
          title="维保计划"
          icon={Wrench}
          resource="maintenancePlans"
          items={maintenancePlans}
          columns={[
            { key: 'id', label: '计划编号' }, { key: 'name', label: '计划名称' }, { key: 'device', label: '维保对象' },
            { key: 'cycle', label: '周期' }, { key: 'owner', label: '责任人' }, { key: 'dueDate', label: '到期日期' },
            { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
          ]}
          fields={[
            { key: 'name', label: '计划名称', required: true }, { key: 'device', label: '维保对象', required: true },
            { key: 'cycle', label: '维保周期', type: 'select', options: ['每月', '每季度', '每半年', '每年'], required: true },
            { key: 'owner', label: '责任人', required: true }, { key: 'dueDate', label: '到期日期', type: 'date', required: true },
            { key: 'status', label: '状态', type: 'select', options: ['待执行', '进行中', '已完成', '已逾期'], defaultValue: '待执行' }
          ]}
        />
      )}
      {tab === 'simulator' && <SimulatorPanel />}
    </ModuleScaffold>
  );
}

function EnergyPage() {
  const [tab, setTab] = useState('overview');
  const { perform } = useRuntime();
  return (
    <ModuleScaffold
      title="能耗监测与费用核算"
      intro="按园区、楼栋、企业、设备和时间维度分析水电气冷热源消耗。"
      actions={[
        { label: '模拟能耗突增', icon: Zap, onClick: () => perform(() => runScenario('energy-spike'), '已触发能耗突增场景') },
        { label: '导出能耗报表', icon: Download, onClick: () => perform(() => downloadReport('energy'), '能耗报表已导出') }
      ]}
    >
      <section className="summary-grid">
        <SummaryCard icon={Zap} label="今日用电" value={`${energyOverview.electricityToday.toLocaleString()} kWh`} tone="amber" />
        <SummaryCard icon={DropletIcon} label="今日用水" value={`${energyOverview.waterToday} m³`} tone="blue" />
        <SummaryCard icon={BarChart3} label="单位面积能耗" value={`${energyOverview.energyPerSquareMeter} kWh/㎡`} tone="green" />
        <SummaryCard icon={Flame} label="碳排估算" value={`${energyOverview.carbonToday} tCO₂`} tone="red" />
      </section>
      <TabStrip active={tab} onChange={setTab} tabs={[{ id: 'overview', label: '能耗总览' }, { id: 'bills', label: '费用账单', count: energyBills.length }]} />
      {tab === 'overview' && <section className="split-grid">
        <div className="panel">
          <PanelTitle icon={BarChart3} title="分时用电趋势" action="明细" />
          <TrendChart mode="energy" />
        </div>
        <div className="panel">
          <PanelTitle icon={Building2} title="楼栋能耗排行" action="对比" />
          <div className="ranking">
            {energyRanking.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <div className="progress energy-progress">
                  <i style={{ width: `${item.percent}%` }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>}
      {tab === 'bills' && (
        <ResourceManager
          title="企业能耗账单"
          icon={FileText}
          resource="energyBills"
          items={energyBills}
          columns={[
            { key: 'id', label: '账单编号' }, { key: 'enterprise', label: '企业' }, { key: 'period', label: '计费周期' },
            { key: 'electricity', label: '用电量 kWh' }, { key: 'water', label: '用水量 m³' }, { key: 'amount', label: '应收金额' },
            { key: 'paid', label: '已收金额' }, { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
          ]}
          fields={[
            { key: 'enterprise', label: '企业名称', required: true }, { key: 'period', label: '计费周期', required: true },
            { key: 'electricity', label: '用电量', type: 'number', required: true }, { key: 'water', label: '用水量', type: 'number', required: true },
            { key: 'amount', label: '应收金额', type: 'number', required: true }, { key: 'paid', label: '已收金额', type: 'number', defaultValue: 0 },
            { key: 'status', label: '账单状态', type: 'select', options: ['待出账', '待支付', '已支付', '部分支付', '已逾期', '已作废'], defaultValue: '待支付' }
          ]}
        />
      )}
    </ModuleScaffold>
  );
}

function DropletIcon(props) {
  return <CloudSun {...props} />;
}

function SecurityPage() {
  const [tab, setTab] = useState('video');
  const { perform } = useRuntime();
  return (
    <ModuleScaffold
      title="安防一体化联动管控"
      intro="视频、门禁、车辆、访客、消防和周界告警统一接入并闭环处置。"
      actions={[
        { label: '模拟异常通行', icon: ShieldAlert, onClick: () => perform(() => runScenario('access'), '已触发异常通行场景') },
        { label: '模拟消防火警', icon: Flame, onClick: () => perform(() => runScenario('fire'), '已触发消防火警场景') }
      ]}
    >
      <TabStrip active={tab} onChange={setTab} tabs={[
        { id: 'video', label: '视频监控', count: cameras.length },
        { id: 'visitors', label: '访客管理', count: visitors.length },
        { id: 'vehicles', label: '车辆管理', count: vehicles.length },
        { id: 'access', label: '通行记录', count: accessRecords.length }
      ]} />
      {tab === 'video' && <section className="security-grid">
        <div className="panel video-panel">
          <PanelTitle icon={Camera} title="视频监控" action="16 分屏" />
          <div className="video-wall">
            {cameras.slice(0, 4).map((camera, index) => (
              <div className="video-cell" key={camera.id}>
                <Camera size={28} />
                <span>{camera.name}</span>
                <i>LIVE</i>
                <div className={`scan-line s-${index}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <PanelTitle icon={DoorOpen} title="门禁与车辆" action="记录" />
          <div className="summary-stack">
            <SummaryInline icon={DoorOpen} label="今日通行" value="2,418 人次" />
            <SummaryInline icon={Car} label="当前车位" value="124 个空余" />
            <SummaryInline icon={KeyRound} label="访客待审批" value={`${visitors.filter((item) => item.status === '待审批').length} 条`} />
            <SummaryInline icon={ShieldAlert} label="安防事件" value={`${realtimeAlarms.filter((item) => ['安防', '门禁', '消防'].includes(item.type)).length} 条`} />
          </div>
        </div>
      </section>}
      {tab === 'video' && <section className="panel">
        <PanelTitle icon={Flame} title="消防与周界告警处置" action="应急预案" />
        <ProcessFlow
          steps={['接收告警', '三维定位', '视频联动', '人员确认', '派发任务', '处置归档']}
          activeIndex={3}
        />
      </section>}
      {tab === 'video' && <CameraManager />}
      {tab === 'visitors' && <SecurityResource type="visitors" />}
      {tab === 'vehicles' && <SecurityResource type="vehicles" />}
      {tab === 'access' && <SecurityResource type="accessRecords" />}
    </ModuleScaffold>
  );
}

function EnvironmentPage() {
  const [tab, setTab] = useState('overview');
  const { perform } = useRuntime();
  const averageTemp = environmentPoints.length ? (environmentPoints.reduce((sum, item) => sum + Number(item.temp || 0), 0) / environmentPoints.length).toFixed(1) : 0;
  return (
    <ModuleScaffold
      title="环境实时感知与阈值预警"
      intro="温湿度、PM2.5、CO₂、噪声、烟感、水浸等指标按点位集中展示。"
      actions={[
        { label: '模拟水浸告警', icon: AlertTriangle, onClick: () => perform(() => runScenario('environment'), '已触发地下泵房水浸场景') },
        { label: '恢复环境状态', icon: RotateCcw, onClick: () => perform(() => runScenario('normal'), '环境状态已恢复') }
      ]}
    >
      <section className="summary-grid">
        <SummaryCard icon={Gauge} label="综合评分" value={Math.max(60, 98 - environmentPoints.filter((item) => item.status !== '正常').length * 4)} tone="green" />
        <SummaryCard icon={Thermometer} label="平均温度" value={`${averageTemp}℃`} tone="amber" />
        <SummaryCard icon={CloudSun} label="空气质量" value="优" tone="cyan" />
        <SummaryCard icon={AlertTriangle} label="异常点位" value={environmentPoints.filter((item) => item.status !== '正常').length} tone="red" />
      </section>
      <TabStrip active={tab} onChange={setTab} tabs={[
        { id: 'overview', label: '环境总览' },
        { id: 'points', label: '点位管理', count: environmentPoints.length },
        { id: 'thresholds', label: '阈值配置', count: environmentThresholds.length }
      ]} />
      {tab === 'overview' && <section className="split-grid">
        <div className="panel">
          <PanelTitle icon={MapPinned} title="环境热力分布" action="CO₂" />
          <div className="heatmap-grid">
            {Array.from({ length: 48 }).map((_, index) => (
              <span key={index} style={{ '--heat': (index * 17 + 31) % 100 }} />
            ))}
          </div>
        </div>
        <div className="panel">
          <PanelTitle icon={Thermometer} title="点位详情" action="趋势" />
          <DataTable
            columns={['点位', '温度', '湿度', 'PM2.5', 'CO₂', '噪声', '状态']}
            rows={environmentPoints.map((item) => [
              item.name,
              `${item.temp}℃`,
              `${item.humidity}%`,
              `${item.pm25}`,
              `${item.co2} ppm`,
              `${item.noise} dB`,
              item.status
            ])}
          />
        </div>
      </section>}
      {tab === 'points' && <EnvironmentPointManager />}
      {tab === 'thresholds' && (
        <ResourceManager
          title="环境阈值规则"
          icon={SlidersHorizontal}
          resource="environmentThresholds"
          items={environmentThresholds}
          columns={[
            { key: 'id', label: '规则编号' }, { key: 'metric', label: '指标' }, { key: 'warning', label: '预警阈值' },
            { key: 'alarm', label: '告警阈值' }, { key: 'enabled', label: '状态', render: (value) => <Badge value={value ? '启用' : '停用'} /> }
          ]}
          fields={[
            { key: 'metric', label: '指标名称', required: true }, { key: 'warning', label: '预警阈值', required: true },
            { key: 'alarm', label: '告警阈值', required: true }, { key: 'enabled', label: '是否启用', type: 'checkbox', defaultValue: true }
          ]}
        />
      )}
    </ModuleScaffold>
  );
}

function WorkOrdersPage() {
  const [editor, setEditor] = useState(false);
  const { perform } = useRuntime();
  const statuses = ['待派单', '待处理', '处理中', '待验收'];
  return (
    <ModuleScaffold
      title="物业工单闭环管理"
      intro="报修、告警、巡检、维保和投诉建议统一进入工单流程。"
      actions={[{ label: '新建工单', icon: Plus, onClick: () => setEditor(true) }, { label: '导出工单报表', icon: Download, onClick: () => perform(() => downloadReport('workorders'), '工单报表已导出') }]}
    >
      <section className="kanban">
        {statuses.map((status) => (
          <div className="kanban-col" key={status}>
            <h3>{status}</h3>
            {workorders
              .filter((item) => item.status === status)
              .slice(0, 3)
              .map((item) => (
                <div className="ticket-card" key={`${status}-${item.id}`}>
                  <strong>{item.title}</strong>
                  <span>{item.type} · {item.location}</span>
                  <div>
                    <Badge value={item.priority} />
                    <small>SLA {item.sla}</small>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </section>
      <section className="panel">
        <PanelTitle icon={ClipboardList} title="工单明细" action="导出" />
        <WorkorderTable />
      </section>
      {editor && (
        <ResourceEditor
          title="新建工单"
          item={{}}
          fields={[
            { key: 'title', label: '工单标题', required: true }, { key: 'type', label: '工单类型', type: 'select', options: ['企业报修', '设备故障', '巡检异常', '安防事件', '环境异常', '公共设施维修'], required: true },
            { key: 'location', label: '所属位置', required: true }, { key: 'priority', label: '优先级', type: 'select', options: ['一般', '紧急', '严重'], defaultValue: '一般' },
            { key: 'owner', label: '处理人', defaultValue: '未分配' }, { key: 'sla', label: '完成时限', defaultValue: '48 小时' },
            { key: 'description', label: '问题描述', type: 'textarea' }
          ]}
          onClose={() => setEditor(false)}
          onSubmit={async (data) => {
            const result = await perform(() => createWorkorder(data), '工单已创建');
            if (result) setEditor(false);
          }}
        />
      )}
    </ModuleScaffold>
  );
}

function EnterprisePage() {
  const [tab, setTab] = useState('enterprises');
  return (
    <ModuleScaffold
      title="企业服务与档案管理"
      intro="企业档案、租赁合同、服务申请、费用账单、通知公告和满意度评价统一管理。"
      actions={[]}
    >
      <section className="summary-grid">
        <SummaryCard icon={Users} label="入驻企业" value={`${92 + enterprises.length} 家`} tone="green" />
        <SummaryCard icon={FileText} label="即将到期合同" value={`${contracts.filter((item) => item.status === '即将到期').length} 份`} tone="amber" />
        <SummaryCard icon={ClipboardList} label="服务申请" value={`${serviceRequests.length} 条`} tone="cyan" />
        <SummaryCard icon={Bell} label="公告阅读率" value="92%" tone="violet" />
      </section>
      <TabStrip active={tab} onChange={setTab} tabs={[
        { id: 'enterprises', label: '企业档案', count: enterprises.length },
        { id: 'requests', label: '服务申请', count: serviceRequests.length },
        { id: 'announcements', label: '通知公告', count: announcements.length }
      ]} />
      {tab === 'enterprises' && <EnterpriseManager />}
      {tab === 'requests' && <ServiceRequestManager />}
      {tab === 'announcements' && <AnnouncementManager />}
    </ModuleScaffold>
  );
}

function SpacePage() {
  const [tab, setTab] = useState('visual');
  const roomStates = roomAssets.map((item) => [item.room, item.state, item.enterprise, item.area]);
  return (
    <ModuleScaffold
      title="空间资产与租赁状态"
      intro="园区、楼栋、楼层、房间、公共区域、资产设施和合同信息精细化管理。"
      actions={[]}
    >
      <TabStrip active={tab} onChange={setTab} tabs={[
        { id: 'visual', label: '租赁视图' }, { id: 'buildings', label: '楼栋管理', count: buildingStats.length },
        { id: 'rooms', label: '房间管理', count: roomAssets.length }, { id: 'contracts', label: '合同管理', count: contracts.length }
      ]} />
      {tab === 'visual' && <section className="space-grid">
        <div className="panel">
          <PanelTitle icon={Building2} title="空间资源树" action="定位" />
          <div className="resource-tree">
            <TreeNode label="科创产业园" open />
            {buildingStats.map((item) => (
              <TreeNode key={item.name} label={`${item.name} · ${item.floors}F`} />
            ))}
          </div>
        </div>
        <div className="panel">
          <PanelTitle icon={MapPinned} title="租赁状态可视化" action="三维" />
          <div className="room-grid">
            {roomStates.map(([room, state]) => (
              <span className={`room-tile ${roomStateClass(state)}`} key={room}>
                {room}
                <small>{state}</small>
              </span>
            ))}
          </div>
        </div>
      </section>}
      {tab === 'buildings' && <BuildingManager />}
      {tab === 'rooms' && <RoomManager />}
      {tab === 'contracts' && <ContractManager />}
    </ModuleScaffold>
  );
}

function AlarmsPage({ setActive, onSimulate, onAcknowledge, onCreateOrder, onClose }) {
  const [tab, setTab] = useState('alarms');
  const severeCount = realtimeAlarms.filter((item) => item.level.includes('一级')).length;
  const urgentCount = realtimeAlarms.filter((item) => item.level.includes('二级')).length;
  const normalCount = realtimeAlarms.filter((item) => item.level.includes('三级')).length;
  return (
    <ModuleScaffold
      title="统一告警中心"
      intro="接收设备、能耗、安防、消防、环境、门禁、车辆和接口异常告警。"
      actions={[]}
    >
      <section className="summary-grid">
        <SummaryCard icon={Flame} label="一级严重" value={severeCount} tone="red" />
        <SummaryCard icon={ShieldAlert} label="二级紧急" value={urgentCount} tone="amber" />
        <SummaryCard icon={AlertTriangle} label="三级一般" value={normalCount} tone="cyan" />
        <SummaryCard icon={CheckCircle2} label="已关闭" value={realtimeAlarms.filter((item) => item.status === '已关闭').length} tone="green" />
      </section>
      <TabStrip active={tab} onChange={setTab} tabs={[{ id: 'alarms', label: '实时告警', count: realtimeAlarms.length }, { id: 'rules', label: '告警规则', count: alarmRules.length }]} />
      {tab === 'alarms' && <section className="panel">
        <PanelTitle icon={Bell} title="实时告警列表" action="自动刷新" />
        <div className="alarm-table-actions">
          <button onClick={onSimulate}>
            <RadioTower size={16} /> 模拟实时告警
          </button>
          <button onClick={() => setActive('twin')}>
            <MapPinned size={16} /> 三维定位
          </button>
          <button onClick={() => setActive('workorders')}>
            <Send size={16} /> 生成工单
          </button>
        </div>
        <AlarmList onAcknowledge={onAcknowledge} onCreateOrder={onCreateOrder} onClose={onClose} />
      </section>}
      {tab === 'alarms' && <section className="panel">
        <PanelTitle icon={SlidersHorizontal} title="联动规则示例" action="编辑" />
        <ProcessFlow steps={['消防火警', '三维定位', '弹出摄像头', '通知消控室', '生成严重工单', '处置归档']} activeIndex={2} />
      </section>}
      {tab === 'rules' && <AlarmRuleManager />}
    </ModuleScaffold>
  );
}

function ReportsPage() {
  const { perform } = useRuntime();
  const reports = [
    { type: 'operations', name: '园区运营日报', category: '运营', schedule: '每日 08:00', description: '企业、空间、设备、告警与工单核心指标' },
    { type: 'devices', name: '设备运行报表', category: '运维', schedule: '按需生成', description: '虚拟设备在线状态、运行状态与健康评分' },
    { type: 'energy', name: '能耗账单报表', category: '能源', schedule: '每月 1 日', description: '企业水电用量、费用与缴费状态' },
    { type: 'alarms', name: '告警事件报表', category: '治理', schedule: '每日 18:00', description: '告警等级、来源、位置和处置状态' },
    { type: 'workorders', name: '工单效率报表', category: '物业', schedule: '每周一', description: '工单优先级、状态、处理人和闭环结果' }
  ];
  return (
    <ModuleScaffold
      title="报表中心"
      intro="运营、设备、能耗、安防、工单和企业服务数据统一统计分析。"
      actions={[]}
    >
      <section className="summary-grid">
        <SummaryCard icon={FileBarChart} label="报表模板" value={reports.length} tone="cyan" />
        <SummaryCard icon={Download} label="可导出格式" value="CSV" tone="green" />
        <SummaryCard icon={BarChart3} label="业务数据集" value="5" tone="violet" />
        <SummaryCard icon={Database} label="实时数据源" value="已连接" tone="amber" />
      </section>
      <section className="report-grid">
        {reports.map((report) => (
          <article className="report-card" key={report.type}>
            <FileBarChart size={24} />
            <strong>{report.name}</strong>
            <span>{report.description}</span>
            <small>{report.category} · {report.schedule}</small>
            <button className="primary-action" onClick={() => perform(() => downloadReport(report.type), `${report.name}已导出`)}>
              <Download size={16} /> 导出 CSV
            </button>
          </article>
        ))}
      </section>
    </ModuleScaffold>
  );
}

function SystemPage() {
  const [tab, setTab] = useState('users');
  const { perform } = useRuntime();
  return (
    <ModuleScaffold
      title="系统管理与权限配置"
      intro="用户、角色、菜单、按钮、数据、空间、接口和日志统一治理。"
      actions={[{ label: '重置演示数据', icon: RotateCcw, onClick: () => {
        if (window.confirm('确认恢复全部初始虚拟演示数据吗？')) perform(resetDemo, '演示数据已恢复');
      } }]}
    >
      <section className="system-grid">
        {[
          [Users, '用户管理', '账号、部门、角色、状态、最近登录'],
          [Lock, '角色权限', '菜单、按钮、数据和三维空间权限'],
          [Database, '数据字典', '设备类型、告警等级、工单状态等枚举'],
          [FileText, '系统日志', '登录、操作、接口、同步和异常日志']
        ].map(([Icon, title, text]) => (
          <div className="system-card" key={title}>
            <Icon size={24} />
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        ))}
      </section>
      <TabStrip active={tab} onChange={setTab} tabs={[
        { id: 'users', label: '用户管理', count: systemUsers.length },
        { id: 'roles', label: '角色权限', count: systemRoles.length },
        { id: 'dictionary', label: '数据字典', count: dataDictionaries.length },
        { id: 'integrations', label: '接口管理', count: integrations.length },
        { id: 'logs', label: '审计日志', count: auditLogs.length },
        { id: 'simulator', label: '仿真器设置' }
      ]} />
      {tab === 'users' && <UserManager />}
      {tab === 'roles' && <RoleManager />}
      {tab === 'dictionary' && <DictionaryManager />}
      {tab === 'integrations' && <IntegrationManager />}
      {tab === 'logs' && (
        <div className="panel">
          <PanelTitle icon={FileText} title="审计日志" action="自动记录" />
          <DataTable columns={['日志编号', '用户', '操作', '模块', '详情', '时间']} rows={auditLogs.map((item) => [item.id, item.user, item.action, item.module, item.detail, item.time])} />
        </div>
      )}
      {tab === 'simulator' && <SimulatorPanel />}
    </ModuleScaffold>
  );
}

function SimulatorPanel() {
  const { perform } = useRuntime();
  const scenarios = [
    ['normal', '日常运营', CheckCircle2],
    ['pump-fault', '冷却泵故障', Wrench],
    ['fire', '消防火警', Flame],
    ['energy-spike', '能耗突增', Zap],
    ['environment', '地下泵房水浸', Thermometer],
    ['access', '异常通行', ShieldAlert]
  ];
  return (
    <div className="panel simulator-panel">
      <PanelTitle icon={RadioTower} title="虚拟园区仿真器" action={simulatorState.enabled ? '运行中' : '已暂停'} />
      <div className="simulator-summary">
        <div>
          <span>当前场景</span>
          <strong>{simulatorState.scenario}</strong>
        </div>
        <div>
          <span>仿真速度</span>
          <strong>{simulatorState.speed}×</strong>
        </div>
        <div>
          <span>自动告警</span>
          <strong>{simulatorState.autoAlarm ? '开启' : '关闭'}</strong>
        </div>
      </div>
      <div className="simulator-controls">
        <label>
          <input
            type="checkbox"
            checked={Boolean(simulatorState.enabled)}
            onChange={(event) => perform(() => updateSimulator({ enabled: event.target.checked }), event.target.checked ? '仿真器已启动' : '仿真器已暂停')}
          />
          实时数据仿真
        </label>
        <label>
          <input
            type="checkbox"
            checked={Boolean(simulatorState.autoAlarm)}
            onChange={(event) => perform(() => updateSimulator({ autoAlarm: event.target.checked }), '自动告警设置已更新')}
          />
          周期自动告警
        </label>
        <label>
          仿真速度
          <select value={simulatorState.speed} onChange={(event) => perform(() => updateSimulator({ speed: Number(event.target.value) }), '仿真速度已更新')}>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="5">5×</option>
          </select>
        </label>
      </div>
      <div className="scenario-grid">
        {scenarios.map(([id, label, Icon]) => (
          <button key={id} onClick={() => perform(() => runScenario(id), `已运行“${label}”场景`)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SecurityResource({ type }) {
  const configs = {
    visitors: {
      title: '访客预约',
      icon: UserRound,
      items: visitors,
      columns: [
        { key: 'id', label: '预约编号' }, { key: 'name', label: '访客姓名' }, { key: 'phone', label: '手机号' },
        { key: 'enterprise', label: '访问企业' }, { key: 'visitTime', label: '来访时间' }, { key: 'reason', label: '访问事由' },
        { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ],
      fields: [
        { key: 'name', label: '访客姓名', required: true }, { key: 'phone', label: '手机号', required: true },
        { key: 'enterprise', label: '访问企业', required: true }, { key: 'visitTime', label: '来访时间', required: true },
        { key: 'reason', label: '访问事由', required: true }, { key: 'plate', label: '车牌号', defaultValue: '-' },
        { key: 'status', label: '状态', type: 'select', options: ['待审批', '已通过', '已拒绝', '待到访', '已入园', '已离园', '已过期'], defaultValue: '待审批' }
      ]
    },
    vehicles: {
      title: '车辆档案',
      icon: Car,
      items: vehicles,
      columns: [
        { key: 'id', label: '车辆编号' }, { key: 'plate', label: '车牌号' }, { key: 'owner', label: '所属企业/人员' },
        { key: 'type', label: '车辆类型' }, { key: 'entryTime', label: '入园时间' }, { key: 'parking', label: '车位' },
        { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ],
      fields: [
        { key: 'plate', label: '车牌号', required: true }, { key: 'owner', label: '所属企业/人员', required: true },
        { key: 'type', label: '车辆类型', type: 'select', options: ['固定车辆', '临时车辆'], defaultValue: '固定车辆' },
        { key: 'entryTime', label: '入园时间' }, { key: 'parking', label: '车位' },
        { key: 'status', label: '状态', type: 'select', options: ['在园', '已离园', '黑名单'], defaultValue: '在园' }
      ]
    },
    accessRecords: {
      title: '人员通行记录',
      icon: DoorOpen,
      items: accessRecords,
      columns: [
        { key: 'id', label: '记录编号' }, { key: 'person', label: '人员' }, { key: 'enterprise', label: '企业' },
        { key: 'gate', label: '门禁点' }, { key: 'direction', label: '方向' }, { key: 'time', label: '时间' },
        { key: 'result', label: '结果', render: (value) => <Badge value={value} /> }
      ],
      fields: [
        { key: 'person', label: '人员姓名', required: true }, { key: 'enterprise', label: '所属企业', defaultValue: '-' },
        { key: 'gate', label: '门禁点', required: true }, { key: 'direction', label: '方向', type: 'select', options: ['入园', '离园', '入楼', '出楼'], defaultValue: '入园' },
        { key: 'time', label: '时间', required: true }, { key: 'result', label: '结果', type: 'select', options: ['通过', '拒绝'], defaultValue: '通过' }
      ]
    }
  };
  const config = configs[type];
  return <ResourceManager resource={type} {...config} />;
}

function CameraManager() {
  return (
    <ResourceManager
      title="摄像头设备管理"
      icon={Camera}
      resource="cameras"
      items={cameras}
      columns={[
        { key: 'id', label: '摄像头编号' }, { key: 'name', label: '摄像头名称' }, { key: 'area', label: '所属位置' },
        { key: 'online', label: '在线状态', render: (value) => <Badge value={value} /> },
        { key: 'stream', label: '视频流' }, { key: 'storage', label: '存储状态' }, { key: 'preset', label: '预置位' }
      ]}
      fields={[
        { key: 'name', label: '摄像头名称', required: true }, { key: 'area', label: '所属位置', required: true },
        { key: 'online', label: '在线状态', type: 'select', options: ['在线', '离线'], defaultValue: '在线' },
        { key: 'stream', label: '视频流状态', type: 'select', options: ['正常', '异常'], defaultValue: '正常' },
        { key: 'storage', label: '存储状态', type: 'select', options: ['正常', '异常'], defaultValue: '正常' },
        { key: 'preset', label: '默认预置位', required: true }
      ]}
    />
  );
}

function EnvironmentPointManager() {
  return (
    <ResourceManager
      title="环境监测点位"
      icon={Thermometer}
      resource="environment"
      items={environmentPoints}
      columns={[
        { key: 'id', label: '点位编号' }, { key: 'name', label: '点位名称' }, { key: 'temp', label: '温度℃' },
        { key: 'humidity', label: '湿度%' }, { key: 'pm25', label: 'PM2.5' }, { key: 'co2', label: 'CO₂ ppm' },
        { key: 'noise', label: '噪声 dB' }, { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'name', label: '点位名称', required: true }, { key: 'temp', label: '温度', type: 'number', defaultValue: 25 },
        { key: 'humidity', label: '湿度', type: 'number', defaultValue: 55 }, { key: 'pm25', label: 'PM2.5', type: 'number', defaultValue: 20 },
        { key: 'co2', label: 'CO₂', type: 'number', defaultValue: 600 }, { key: 'noise', label: '噪声', type: 'number', defaultValue: 45 },
        { key: 'status', label: '状态', type: 'select', options: ['正常', '预警', '告警', '离线'], defaultValue: '正常' }
      ]}
    />
  );
}

function WorkorderTable() {
  const { perform } = useRuntime();
  const next = {
    '待受理': ['待派单', '受理'],
    '待派单': ['待处理', '派单'],
    '待处理': ['处理中', '接单'],
    '处理中': ['待验收', '提交验收'],
    '待验收': ['已完成', '完成'],
    '已完成': ['已关闭', '关闭']
  };
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {['工单编号', '标题', '类型', '位置', '优先级', '状态', '处理人', 'SLA', '操作'].map((item) => <th key={item}>{item}</th>)}
          </tr>
        </thead>
        <tbody>
          {workorders.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td><td>{item.title}</td><td>{item.type}</td><td>{item.location}</td>
              <td><Badge value={item.priority} /></td><td><Badge value={item.status} /></td><td>{item.owner}</td><td>{item.sla}</td>
              <td>
                <div className="table-actions">
                  {next[item.status] && (
                    <button onClick={() => perform(() => updateWorkorder(item.id, {
                      status: next[item.status][0],
                      owner: item.owner === '未分配' ? '刘工' : item.owner,
                      result: `${next[item.status][1]}操作已完成`
                    }), `工单已${next[item.status][1]}`)}>
                      {next[item.status][1]}
                    </button>
                  )}
                  {item.status === '待验收' && <button onClick={() => perform(() => updateWorkorder(item.id, { status: '处理中', result: '验收未通过，退回处理' }), '工单已退回')}>退回</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnterpriseManager() {
  return (
    <ResourceManager
      title="企业档案"
      icon={Users}
      resource="enterprises"
      items={enterprises}
      columns={[
        { key: 'id', label: '企业编号' }, { key: 'name', label: '企业名称' }, { key: 'building', label: '楼栋' },
        { key: 'rooms', label: '房间' }, { key: 'area', label: '面积㎡' }, { key: 'industry', label: '行业' },
        { key: 'status', label: '企业状态', render: (value) => <Badge value={value} /> }, { key: 'bill', label: '缴费状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'name', label: '企业名称', required: true }, { key: 'industry', label: '所属行业', required: true },
        { key: 'building', label: '租赁楼栋', required: true }, { key: 'rooms', label: '租赁房间', required: true },
        { key: 'area', label: '租赁面积', type: 'number', required: true },
        { key: 'status', label: '企业状态', type: 'select', options: ['在驻', '即将到期', '已退租', '欠费', '黑名单'], defaultValue: '在驻' },
        { key: 'bill', label: '缴费状态', type: 'select', options: ['正常', '欠费'], defaultValue: '正常' }
      ]}
    />
  );
}

function ServiceRequestManager() {
  return (
    <ResourceManager
      title="企业服务申请"
      icon={ClipboardList}
      resource="serviceRequests"
      items={serviceRequests}
      columns={[
        { key: 'id', label: '申请编号' }, { key: 'enterprise', label: '企业' }, { key: 'type', label: '申请类型' },
        { key: 'title', label: '申请标题' }, { key: 'applicant', label: '申请人' }, { key: 'createdAt', label: '提交时间' },
        { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'enterprise', label: '企业名称', required: true }, { key: 'type', label: '申请类型', type: 'select', options: ['入驻申请', '退租申请', '装修申请', '会议室预约', '访客预约', '车辆登记', '网络开通', '政策咨询'], required: true },
        { key: 'title', label: '申请标题', required: true }, { key: 'applicant', label: '申请人', required: true },
        { key: 'createdAt', label: '提交时间', required: true }, { key: 'status', label: '状态', type: 'select', options: ['待审批', '已通过', '已拒绝', '处理中', '已完成'], defaultValue: '待审批' }
      ]}
    />
  );
}

function AnnouncementManager() {
  return (
    <ResourceManager
      title="通知公告"
      icon={Bell}
      resource="announcements"
      items={announcements}
      columns={[
        { key: 'id', label: '公告编号' }, { key: 'title', label: '标题' }, { key: 'category', label: '分类' },
        { key: 'audience', label: '发送范围' }, { key: 'publishAt', label: '发布时间' }, { key: 'readRate', label: '阅读率' },
        { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'title', label: '公告标题', required: true }, { key: 'category', label: '公告分类', type: 'select', options: ['园区通知', '停水停电', '活动通知', '政策通知', '安全通知'], required: true },
        { key: 'audience', label: '发送范围', defaultValue: '全园区' }, { key: 'publishAt', label: '发布时间', required: true },
        { key: 'status', label: '状态', type: 'select', options: ['草稿', '已发布', '已撤回'], defaultValue: '草稿' }, { key: 'readRate', label: '阅读率', defaultValue: '0%' }
      ]}
    />
  );
}

function RoomManager() {
  return (
    <ResourceManager
      title="房间资源"
      icon={Building2}
      resource="rooms"
      items={roomAssets}
      columns={[
        { key: 'id', label: '资源编号' }, { key: 'room', label: '房间' }, { key: 'building', label: '楼栋' },
        { key: 'floor', label: '楼层' }, { key: 'area', label: '面积' }, { key: 'enterprise', label: '当前企业' },
        { key: 'state', label: '状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'room', label: '房间编号', required: true }, { key: 'building', label: '所属楼栋', required: true },
        { key: 'floor', label: '所属楼层', type: 'number', required: true }, { key: 'area', label: '面积', required: true },
        { key: 'enterprise', label: '当前企业', defaultValue: '-' },
        { key: 'state', label: '使用状态', type: 'select', options: ['空置', '已租', '预定', '装修中', '维修中', '自用', '不可租', '即将到期', '欠费异常'], defaultValue: '空置' }
      ]}
    />
  );
}

function BuildingManager() {
  return (
    <ResourceManager
      title="楼栋资源"
      icon={Building2}
      resource="buildings"
      items={buildingStats}
      columns={[
        { key: 'id', label: '楼栋编号' }, { key: 'name', label: '楼栋名称' }, { key: 'floors', label: '楼层数' },
        { key: 'enterprises', label: '入驻企业' }, { key: 'occupancy', label: '出租率%' }, { key: 'energy', label: '今日能耗' },
        { key: 'health', label: '健康评分' }
      ]}
      fields={[
        { key: 'name', label: '楼栋名称', required: true }, { key: 'floors', label: '楼层数', type: 'number', required: true },
        { key: 'enterprises', label: '入驻企业数', type: 'number', defaultValue: 0 }, { key: 'occupancy', label: '出租率', type: 'number', defaultValue: 0 },
        { key: 'energy', label: '今日能耗', type: 'number', defaultValue: 0 }, { key: 'alarms', label: '告警数', type: 'number', defaultValue: 0 },
        { key: 'health', label: '健康评分', type: 'number', defaultValue: 90 }
      ]}
    />
  );
}

function ContractManager() {
  return (
    <ResourceManager
      title="租赁合同"
      icon={FileText}
      resource="contracts"
      items={contracts}
      columns={[
        { key: 'id', label: '合同编号' }, { key: 'enterprise', label: '企业' }, { key: 'rooms', label: '租赁房间' },
        { key: 'area', label: '面积㎡' }, { key: 'startDate', label: '开始日期' }, { key: 'endDate', label: '结束日期' },
        { key: 'rent', label: '租金单价' }, { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'enterprise', label: '企业名称', required: true }, { key: 'rooms', label: '租赁房间', required: true },
        { key: 'area', label: '租赁面积', type: 'number', required: true }, { key: 'startDate', label: '合同开始日期', type: 'date', required: true },
        { key: 'endDate', label: '合同结束日期', type: 'date', required: true }, { key: 'rent', label: '租金单价', type: 'number', required: true },
        { key: 'propertyFee', label: '物业费单价', type: 'number', required: true },
        { key: 'status', label: '合同状态', type: 'select', options: ['执行中', '即将到期', '已到期', '已终止'], defaultValue: '执行中' }
      ]}
    />
  );
}

function AlarmRuleManager() {
  return (
    <ResourceManager
      title="告警联动规则"
      icon={SlidersHorizontal}
      resource="alarmRules"
      items={alarmRules}
      columns={[
        { key: 'id', label: '规则编号' }, { key: 'name', label: '规则名称' }, { key: 'source', label: '告警来源' },
        { key: 'condition', label: '触发条件' }, { key: 'level', label: '告警等级' }, { key: 'actions', label: '联动动作' },
        { key: 'enabled', label: '状态', render: (value) => <Badge value={value ? '启用' : '停用'} /> }
      ]}
      fields={[
        { key: 'name', label: '规则名称', required: true }, { key: 'source', label: '告警来源', required: true },
        { key: 'condition', label: '触发条件', required: true }, { key: 'level', label: '告警等级', type: 'select', options: ['一级严重', '二级紧急', '三级一般', '四级提醒'], defaultValue: '三级一般' },
        { key: 'actions', label: '联动动作', required: true }, { key: 'enabled', label: '是否启用', type: 'checkbox', defaultValue: true }
      ]}
    />
  );
}

function UserManager() {
  const { perform } = useRuntime();
  const [editor, setEditor] = useState(null);
  async function remove(item) {
    if (!window.confirm(`确认删除用户“${item.name}”吗？`)) return;
    await perform(() => deleteUser(item.id), '用户已删除');
  }
  return (
    <div className="panel">
      <div className="manager-head">
        <PanelTitle icon={Users} title="用户管理" />
        <button className="primary-action" onClick={() => setEditor({ mode: 'create', item: {} })}><Plus size={16} /> 新增用户</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{['用户名', '姓名', '部门', '角色', '状态', '最近登录', '操作'].map((item) => <th key={item}>{item}</th>)}</tr></thead>
          <tbody>
            {systemUsers.map((item) => (
              <tr key={item.id}>
                <td>{item.username}</td><td>{item.name}</td><td>{item.department}</td><td>{item.role}</td>
                <td><Badge value={item.enabled ? '启用' : '停用'} /></td><td>{item.lastLoginAt || '-'}</td>
                <td><div className="table-actions"><button onClick={() => setEditor({ mode: 'edit', item })}>编辑</button><button className="danger-text" onClick={() => remove(item)}>删除</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editor && (
        <ResourceEditor
          title={`${editor.mode === 'create' ? '新增' : '编辑'}用户`}
          item={editor.item}
          fields={[
            { key: 'username', label: '用户名', required: editor.mode === 'create' },
            { key: 'name', label: '姓名', required: true },
            { key: 'password', label: '密码', type: 'password', required: editor.mode === 'create', placeholder: editor.mode === 'edit' ? '留空则不修改' : '' },
            { key: 'department', label: '所属部门', required: true },
            { key: 'roleId', label: '角色', type: 'select', options: systemRoles.map((role) => ({ label: role.name, value: role.id })), required: true },
            { key: 'enabled', label: '是否启用', type: 'checkbox', defaultValue: true }
          ]}
          onClose={() => setEditor(null)}
          onSubmit={async (data) => {
            const result = editor.mode === 'create'
              ? await perform(() => createUser(data), '用户已新增')
              : await perform(() => updateUser(editor.item.id, data), '用户已更新');
            if (result) setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function RoleManager() {
  const { perform } = useRuntime();
  const [editor, setEditor] = useState(null);
  async function remove(item) {
    if (!window.confirm(`确认删除角色“${item.name}”吗？`)) return;
    await perform(() => deleteRole(item.id), '角色已删除');
  }
  return (
    <div className="panel">
      <div className="manager-head">
        <PanelTitle icon={Lock} title="角色权限" />
        <button className="primary-action" onClick={() => setEditor({ mode: 'create', item: {} })}><Plus size={16} /> 新增角色</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{['角色名称', '菜单权限', '接口权限', '关联用户', '操作'].map((item) => <th key={item}>{item}</th>)}</tr></thead>
          <tbody>
            {systemRoles.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td><td>{item.menus.join('、') || '-'}</td><td>{item.permissions.join('、') || '-'}</td>
                <td>{systemUsers.filter((user) => user.roleId === item.id).length}</td>
                <td><div className="table-actions"><button onClick={() => setEditor({ mode: 'edit', item })}>编辑</button><button className="danger-text" onClick={() => remove(item)}>删除</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editor && (
        <ResourceEditor
          title={`${editor.mode === 'create' ? '新增' : '编辑'}角色`}
          item={editor.item}
          fields={[
            { key: 'name', label: '角色名称', required: true },
            { key: 'menus', label: '菜单权限', type: 'csv', placeholder: 'dashboard,twin,devices' },
            { key: 'permissions', label: '接口权限', type: 'csv', placeholder: 'device:read,device:manage' }
          ]}
          onClose={() => setEditor(null)}
          onSubmit={async (data) => {
            const result = editor.mode === 'create'
              ? await perform(() => createRole(data), '角色已新增')
              : await perform(() => updateRole(editor.item.id, data), '角色已更新');
            if (result) setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function DictionaryManager() {
  return (
    <ResourceManager
      title="数据字典"
      icon={Database}
      resource="dataDictionaries"
      items={dataDictionaries}
      columns={[
        { key: 'id', label: '字典编号' }, { key: 'category', label: '分类' }, { key: 'code', label: '编码' },
        { key: 'label', label: '显示名称' }, { key: 'value', label: '值' },
        { key: 'enabled', label: '状态', render: (value) => <Badge value={value ? '启用' : '停用'} /> }
      ]}
      fields={[
        { key: 'category', label: '字典分类', required: true }, { key: 'code', label: '字典编码', required: true },
        { key: 'label', label: '显示名称', required: true }, { key: 'value', label: '字典值', required: true },
        { key: 'enabled', label: '是否启用', type: 'checkbox', defaultValue: true }
      ]}
    />
  );
}

function IntegrationManager() {
  return (
    <ResourceManager
      title="虚拟接口管理"
      icon={RadioTower}
      resource="integrations"
      items={integrations}
      columns={[
        { key: 'id', label: '接口编号' }, { key: 'name', label: '接口名称' }, { key: 'type', label: '接口类型' },
        { key: 'mode', label: '运行模式' }, { key: 'endpoint', label: '接口地址' }, { key: 'lastSync', label: '最近同步' },
        { key: 'status', label: '状态', render: (value) => <Badge value={value} /> }
      ]}
      fields={[
        { key: 'name', label: '接口名称', required: true }, { key: 'type', label: '接口类型', type: 'select', options: ['MQTT', 'HTTP API', 'GB28181', 'WebSocket', 'Modbus'], required: true },
        { key: 'mode', label: '运行模式', type: 'select', options: ['虚拟仿真'], defaultValue: '虚拟仿真' },
        { key: 'endpoint', label: '接口地址', required: true }, { key: 'lastSync', label: '最近同步', defaultValue: '实时' },
        { key: 'status', label: '状态', type: 'select', options: ['在线', '离线', '异常'], defaultValue: '在线' }
      ]}
    />
  );
}

function ModuleScaffold({ title, intro, actions, children }) {
  return (
    <div className="module-page">
      <section className="module-header">
        <div>
          <p className="eyebrow">业务模块</p>
          <h2>{title}</h2>
          <span>{intro}</span>
        </div>
        <div className="module-actions">
          {actions.map((action, index) => {
            const item = typeof action === 'string' ? { label: action } : action;
            const Icon = item.icon || (index === 0 ? Plus : SlidersHorizontal);
            return (
              <button
                className={index === 0 ? 'primary-action' : 'ghost-action'}
                key={item.label}
                onClick={item.onClick}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      </section>
      {children}
    </div>
  );
}

function TabStrip({ tabs, active, onChange }) {
  return (
    <div className="tab-strip">
      {tabs.map((tab) => (
        <button key={tab.id} className={active === tab.id ? 'active' : ''} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count !== undefined && <span>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

function ResourceManager({
  title,
  icon: Icon = Database,
  resource,
  items,
  columns,
  fields,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  extraActions,
  description
}) {
  const { perform } = useRuntime();
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null);
  const filtered = items.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));

  async function remove(item) {
    if (!window.confirm(`确认删除“${item.name || item.title || item.id}”吗？`)) return;
    await perform(() => deleteResource(resource, item.id), '记录已删除');
  }

  return (
    <div className="panel">
      <div className="manager-head">
        <div>
          <PanelTitle icon={Icon} title={title} />
          {description && <p>{description}</p>}
        </div>
        <div className="manager-actions">
          <label className="mini-search">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前列表" />
          </label>
          {allowCreate && (
            <button className="primary-action" onClick={() => setEditor({ mode: 'create', item: {} })}>
              <Plus size={16} /> 新增
            </button>
          )}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              {(allowEdit || allowDelete || extraActions) && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(item[column.key], item) : formatCell(item[column.key])}
                  </td>
                ))}
                {(allowEdit || allowDelete || extraActions) && (
                  <td>
                    <div className="table-actions">
                      {extraActions?.(item)}
                      {allowEdit && <button onClick={() => setEditor({ mode: 'edit', item })}>编辑</button>}
                      {allowDelete && <button className="danger-text" onClick={() => remove(item)}>删除</button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={columns.length + 1} className="empty-cell">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editor && (
        <ResourceEditor
          title={`${editor.mode === 'create' ? '新增' : '编辑'}${title}`}
          item={editor.item}
          fields={fields}
          onClose={() => setEditor(null)}
          onSubmit={async (data) => {
            const result = editor.mode === 'create'
              ? await perform(() => createResource(resource, data), '记录已新增')
              : await perform(() => updateResource(resource, editor.item.id, data), '记录已更新');
            if (result) setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function ResourceEditor({ title, item, fields, onClose, onSubmit }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((field) => [
    field.key,
    field.type === 'csv' && Array.isArray(item[field.key])
      ? item[field.key].join(',')
      : item[field.key] ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '')
  ])));

  function setValue(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const normalized = {};
    fields.forEach((field) => {
      let value = form[field.key];
      if (field.type === 'number' && value !== '') value = Number(value);
      if (field.type === 'csv') value = String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
      normalized[field.key] = value;
    });
    onSubmit(normalized);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.key} className={field.type === 'textarea' ? 'wide-field' : ''}>
              <span>{field.label}{field.required ? ' *' : ''}</span>
              {field.type === 'select' ? (
                <select value={form[field.key]} onChange={(event) => setValue(field.key, event.target.value)} required={field.required}>
                  <option value="">请选择</option>
                  {(field.options || []).map((option) => {
                    const item = typeof option === 'string' ? { label: option, value: option } : option;
                    return <option key={item.value} value={item.value}>{item.label}</option>;
                  })}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea value={form[field.key]} onChange={(event) => setValue(field.key, event.target.value)} required={field.required} />
              ) : field.type === 'checkbox' ? (
                <input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setValue(field.key, event.target.checked)} />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'password' ? 'password' : 'text'}
                  value={form[field.key]}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  required={field.required}
                  placeholder={field.placeholder || ''}
                />
              )}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost-action" onClick={onClose}>取消</button>
          <button type="submit" className="primary-action">保存</button>
        </div>
      </form>
    </div>
  );
}

function formatCell(value) {
  if (typeof value === 'boolean') return value ? '启用' : '停用';
  if (Array.isArray(value)) return value.join('、');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '-';
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`summary-card ${tone}`}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryInline({ icon: Icon, label, value }) {
  return (
    <div className="summary-inline">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ value }) {
  const cls = value.includes('严重') || value.includes('故障') || value.includes('告警') || value.includes('欠费')
    ? 'danger'
    : value.includes('紧急') || value.includes('预警') || value.includes('即将')
      ? 'warn'
      : value.includes('处理')
        ? 'info'
        : 'good';
  return <span className={`badge ${cls}`}>{value}</span>;
}

function ProcessFlow({ steps, activeIndex }) {
  return (
    <div className="process-flow">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`process-step ${index <= activeIndex ? 'active' : ''}`}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
          {index < steps.length - 1 && <i />}
        </React.Fragment>
      ))}
    </div>
  );
}

function TreeNode({ label, open }) {
  return (
    <div className="tree-node">
      <ChevronRight size={15} className={open ? 'open' : ''} />
      <Building2 size={16} />
      <span>{label}</span>
    </div>
  );
}

function roomStateClass(state) {
  if (state.includes('空置')) return 'vacant';
  if (state.includes('到期')) return 'expire';
  if (state.includes('欠费')) return 'debt';
  if (state.includes('不可')) return 'disabled';
  return 'leased';
}

export default App;
