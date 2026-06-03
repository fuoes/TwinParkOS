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
  RadioTower,
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
  enterprises,
  environmentPoints,
  kpis,
  navItems,
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
  connectRealtime,
  createAlarmWorkorder,
  getBootstrap,
  getMe,
  getToken,
  login,
  simulateAlarm
} from './api.js';

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
      if (['alarm:new', 'alarm:updated', 'workorder:created', 'workorder:updated'].includes(event.type)) {
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

  async function runAlarmAction(action) {
    try {
      await action();
      await refreshData();
    } catch (error) {
      window.alert(error.message);
    }
  }

  if (booting) return <LoadingScreen />;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
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
              onSimulate={() => runAlarmAction(simulateAlarm)}
              onAcknowledge={(alarmId) => runAlarmAction(() => acknowledgeAlarm(alarmId))}
              onCreateOrder={(alarmId) => runAlarmAction(() => createAlarmWorkorder(alarmId))}
            />
          )}
          {active === 'reports' && <ReportsPage />}
          {active === 'system' && <SystemPage />}
        </main>
      </div>
    </div>
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

function AlarmList({ compact = false, onAcknowledge, onCreateOrder }) {
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
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, height, 7),
        new THREE.MeshStandardMaterial({
          color: buildingColors[index],
          roughness: 0.45,
          metalness: 0.08,
          transparent: true,
          opacity: 0.88
        })
      );
      mesh.position.set(buildingPositions[index][0], height / 2, buildingPositions[index][2]);
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
  return (
    <ModuleScaffold
      title="设备全生命周期运维"
      intro="设备台账、实时状态、巡检维保、故障告警和健康评分集中管理。"
      actions={['新增设备', '批量导入', '导出台账']}
    >
      <section className="summary-grid">
        <SummaryCard icon={Cpu} label="设备总数" value="1,307" tone="cyan" />
        <SummaryCard icon={RadioTower} label="在线设备" value="1,284" tone="green" />
        <SummaryCard icon={AlertTriangle} label="故障设备" value="19" tone="red" />
        <SummaryCard icon={Gauge} label="平均健康度" value="91.4%" tone="violet" />
      </section>
      <section className="split-grid">
        <div className="panel">
          <PanelTitle icon={Wrench} title="设备台账" action="筛选" />
          <DataTable
            columns={['设备编号', '设备名称', '类型', '位置', '在线', '状态', '健康', '责任人']}
            rows={devices.map((item) => [item.id, item.name, item.type, item.area, item.online, item.status, `${item.health}`, item.owner])}
          />
        </div>
        <div className="panel">
          <PanelTitle icon={Activity} title="异常设备排行" action="生成工单" />
          <div className="stack-list">
            {devices
              .slice()
              .sort((a, b) => a.health - b.health)
              .slice(0, 4)
              .map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.alarm} · {item.area}</span>
                  </div>
                  <Badge value={item.status} />
                </div>
              ))}
          </div>
        </div>
      </section>
    </ModuleScaffold>
  );
}

function EnergyPage() {
  return (
    <ModuleScaffold
      title="能耗监测与费用核算"
      intro="按园区、楼栋、企业、设备和时间维度分析水电气冷热源消耗。"
      actions={['能耗规则', '费用核算', '导出报表']}
    >
      <section className="summary-grid">
        <SummaryCard icon={Zap} label="今日用电" value={`${energyOverview.electricityToday.toLocaleString()} kWh`} tone="amber" />
        <SummaryCard icon={DropletIcon} label="今日用水" value={`${energyOverview.waterToday} m³`} tone="blue" />
        <SummaryCard icon={BarChart3} label="单位面积能耗" value={`${energyOverview.energyPerSquareMeter} kWh/㎡`} tone="green" />
        <SummaryCard icon={Flame} label="碳排估算" value={`${energyOverview.carbonToday} tCO₂`} tone="red" />
      </section>
      <section className="split-grid">
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
      </section>
      <section className="panel">
        <PanelTitle icon={Users} title="企业能耗账单" action="核算" />
        <DataTable
          columns={['企业名称', '楼栋', '租赁面积', '本月用电', '本月用水', '单位面积能耗', '费用估算', '状态']}
          rows={enterprises.map((item, index) => [
            item.name,
            item.building,
            `${item.area}㎡`,
            `${3200 + index * 820} kWh`,
            `${82 + index * 18} m³`,
            `${(0.36 + index * 0.06).toFixed(2)} kWh/㎡`,
            `￥${(12800 + index * 2600).toLocaleString()}`,
            item.bill
          ])}
        />
      </section>
    </ModuleScaffold>
  );
}

function DropletIcon(props) {
  return <CloudSun {...props} />;
}

function SecurityPage() {
  return (
    <ModuleScaffold
      title="安防一体化联动管控"
      intro="视频、门禁、车辆、访客、消防和周界告警统一接入并闭环处置。"
      actions={['1/4/9 分屏', '录像回放', '事件处置']}
    >
      <section className="security-grid">
        <div className="panel video-panel">
          <PanelTitle icon={Camera} title="视频监控" action="16 分屏" />
          <div className="video-wall">
            {['东门岗', 'B2 厂房西侧', 'A1 大堂', '能源站'].map((name, index) => (
              <div className="video-cell" key={name}>
                <Camera size={28} />
                <span>{name}</span>
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
            <SummaryInline icon={KeyRound} label="访客待审批" value="9 条" />
            <SummaryInline icon={ShieldAlert} label="安防事件" value="4 条待确认" />
          </div>
        </div>
      </section>
      <section className="panel">
        <PanelTitle icon={Flame} title="消防与周界告警处置" action="应急预案" />
        <ProcessFlow
          steps={['接收告警', '三维定位', '视频联动', '人员确认', '派发任务', '处置归档']}
          activeIndex={3}
        />
      </section>
    </ModuleScaffold>
  );
}

function EnvironmentPage() {
  return (
    <ModuleScaffold
      title="环境实时感知与阈值预警"
      intro="温湿度、PM2.5、CO₂、噪声、烟感、水浸等指标按点位集中展示。"
      actions={['阈值配置', '热力图', '导出']}
    >
      <section className="summary-grid">
        <SummaryCard icon={Gauge} label="综合评分" value="91" tone="green" />
        <SummaryCard icon={Thermometer} label="平均温度" value="25.4℃" tone="amber" />
        <SummaryCard icon={CloudSun} label="空气质量" value="优" tone="cyan" />
        <SummaryCard icon={AlertTriangle} label="异常点位" value="3" tone="red" />
      </section>
      <section className="split-grid">
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
      </section>
    </ModuleScaffold>
  );
}

function WorkOrdersPage() {
  return (
    <ModuleScaffold
      title="物业工单闭环管理"
      intro="报修、告警、巡检、维保和投诉建议统一进入工单流程。"
      actions={['新建工单', '批量派单', 'SLA 规则']}
    >
      <section className="kanban">
        {['待受理', '待派单', '处理中', '待验收'].map((status) => (
          <div className="kanban-col" key={status}>
            <h3>{status}</h3>
            {workorders
              .filter((item) => status === '处理中' ? item.status === '处理中' : status === '待验收' ? item.status === '待验收' : item.status !== '处理中' && item.status !== '待验收')
              .slice(0, 2)
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
        <DataTable
          columns={['工单编号', '标题', '类型', '来源', '位置', '优先级', '状态', '处理人', 'SLA']}
          rows={workorders.map((item) => [item.id, item.title, item.type, item.source, item.location, item.priority, item.status, item.owner, item.sla])}
        />
      </section>
    </ModuleScaffold>
  );
}

function EnterprisePage() {
  return (
    <ModuleScaffold
      title="企业服务与档案管理"
      intro="企业档案、租赁合同、服务申请、费用账单、通知公告和满意度评价统一管理。"
      actions={['新增企业', '服务申请', '通知公告']}
    >
      <section className="summary-grid">
        <SummaryCard icon={Users} label="入驻企业" value="96 家" tone="green" />
        <SummaryCard icon={FileText} label="即将到期合同" value="12 份" tone="amber" />
        <SummaryCard icon={ClipboardList} label="服务申请" value="31 条" tone="cyan" />
        <SummaryCard icon={Bell} label="公告阅读率" value="92%" tone="violet" />
      </section>
      <section className="panel">
        <PanelTitle icon={Users} title="企业档案" action="筛选" />
        <DataTable
          columns={['企业名称', '楼栋', '房间', '面积', '行业', '企业状态', '缴费状态']}
          rows={enterprises.map((item) => [item.name, item.building, item.rooms, `${item.area}㎡`, item.industry, item.status, item.bill])}
        />
      </section>
    </ModuleScaffold>
  );
}

function SpacePage() {
  const roomStates = roomAssets.map((item) => [item.room, item.state, item.enterprise, item.area]);
  return (
    <ModuleScaffold
      title="空间资产与租赁状态"
      intro="园区、楼栋、楼层、房间、公共区域、资产设施和合同信息精细化管理。"
      actions={['空间导入', '合同提醒', '租赁视图']}
    >
      <section className="space-grid">
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
      </section>
      <section className="panel">
        <PanelTitle icon={FileText} title="房间与合同清单" action="导出" />
        <DataTable columns={['房间', '状态', '当前企业', '面积']} rows={roomStates} />
      </section>
    </ModuleScaffold>
  );
}

function AlarmsPage({ setActive, onSimulate, onAcknowledge, onCreateOrder }) {
  const severeCount = realtimeAlarms.filter((item) => item.level.includes('一级')).length;
  const urgentCount = realtimeAlarms.filter((item) => item.level.includes('二级')).length;
  const normalCount = realtimeAlarms.filter((item) => item.level.includes('三级')).length;
  return (
    <ModuleScaffold
      title="统一告警中心"
      intro="接收设备、能耗、安防、消防、环境、门禁、车辆和接口异常告警。"
      actions={['告警规则', '联动配置', '历史告警']}
    >
      <section className="summary-grid">
        <SummaryCard icon={Flame} label="一级严重" value={severeCount} tone="red" />
        <SummaryCard icon={ShieldAlert} label="二级紧急" value={urgentCount} tone="amber" />
        <SummaryCard icon={AlertTriangle} label="三级一般" value={normalCount} tone="cyan" />
        <SummaryCard icon={CheckCircle2} label="今日关闭" value="37" tone="green" />
      </section>
      <section className="panel">
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
        <AlarmList onAcknowledge={onAcknowledge} onCreateOrder={onCreateOrder} />
      </section>
      <section className="panel">
        <PanelTitle icon={SlidersHorizontal} title="联动规则示例" action="编辑" />
        <ProcessFlow steps={['消防火警', '三维定位', '弹出摄像头', '通知消控室', '生成严重工单', '处置归档']} activeIndex={2} />
      </section>
    </ModuleScaffold>
  );
}

function ReportsPage() {
  const reports = [
    ['园区运营日报', '运营', '每日 08:00', '可导出'],
    ['能耗月报', '能源', '每月 1 日', '订阅中'],
    ['设备故障报表', '运维', '按需生成', '可导出'],
    ['工单处理效率报表', '物业', '每周一', '订阅中'],
    ['企业服务满意度报表', '企业服务', '每月 5 日', '可导出']
  ];
  return (
    <ModuleScaffold
      title="报表中心"
      intro="运营、设备、能耗、安防、工单和企业服务数据统一统计分析。"
      actions={['自定义报表', '订阅推送', '导出 PDF']}
    >
      <section className="summary-grid">
        <SummaryCard icon={FileBarChart} label="报表模板" value="28" tone="cyan" />
        <SummaryCard icon={Download} label="本月导出" value="146" tone="green" />
        <SummaryCard icon={BarChart3} label="订阅任务" value="9" tone="violet" />
        <SummaryCard icon={Database} label="数据集" value="17" tone="amber" />
      </section>
      <section className="panel">
        <PanelTitle icon={FileBarChart} title="报表清单" action="生成" />
        <DataTable columns={['报表名称', '业务域', '生成周期', '状态']} rows={reports} />
      </section>
    </ModuleScaffold>
  );
}

function SystemPage() {
  return (
    <ModuleScaffold
      title="系统管理与权限配置"
      intro="用户、角色、菜单、按钮、数据、空间、接口和日志统一治理。"
      actions={['新增用户', '角色授权', '接口日志']}
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
      <section className="panel">
        <PanelTitle icon={Lock} title="RBAC 权限矩阵" action="保存" />
        <DataTable
          columns={['角色', '菜单权限', '按钮权限', '数据范围', '空间权限', '接口权限']}
          rows={[
            ['系统管理员', '全部', '全部', '全园区', '全域', '全部'],
            ['园区管理层', '驾驶舱/报表', '查看/导出', '全园区', '全域', '只读'],
            ['物业运维人员', '设备/工单/告警', '处理/派单', '责任区域', '楼栋/楼层', '工单接口'],
            ['企业用户', '服务/账单/访客', '提交/查看', '本企业', '租赁房间', '企业门户']
          ]}
        />
      </section>
    </ModuleScaffold>
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
          {actions.map((action, index) => (
            <button className={index === 0 ? 'primary-action' : 'ghost-action'} key={action}>
              {index === 0 ? <Plus size={16} /> : <SlidersHorizontal size={16} />}
              {action}
            </button>
          ))}
        </div>
      </section>
      {children}
    </div>
  );
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
