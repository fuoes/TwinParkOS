# TwinParkOS

智慧产业园区数字孪生可视化管控平台，集成三维园区、虚拟设备、能耗分析、安防环境监测、告警工单闭环、企业空间管理与 RBAC 权限控制。

## 本地启动

```powershell
npm install
npm run dev:full
```

- 前端：http://localhost:5173/
- 后端健康检查：http://localhost:3001/api/health

演示账号：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 系统管理员 | `admin` | `admin123` |
| 运营管理人员 | `operator` | `operator123` |
| 物业运维人员 | `engineer` | `engineer123` |

## 已实现

- React + Vite + Three.js 园区可视化前端
- JWT 登录与 RBAC 菜单、接口权限
- 设备、告警、工单、企业、空间、能耗、环境 API
- WebSocket 实时遥测模拟与在线状态提示
- 告警模拟、确认、生成工单闭环
- 本地 JSON 开发态持久化
- PostgreSQL + TimescaleDB 生产模型脚本

## 开发数据

本地首次启动会自动创建 `server/data/dev-db.json`。需要恢复初始演示数据时，先停止项目，再执行：

```powershell
npm run reset:dev-data
```

## 生产数据库

PostgreSQL 与 TimescaleDB 表结构位于：

```text
db/postgres-timescale-schema.sql
```

本地 JSON 存储用于零配置演示。部署到真实环境时，应将 `server/store.js` 替换为 PostgreSQL Repository，并将设备遥测和能耗读数写入 TimescaleDB hypertable。
