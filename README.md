# TwinParkOS

智慧产业园区数字孪生可视化管控平台虚拟演示完整体。

本项目不依赖本地物联网设备、视频平台或第三方园区系统。设备状态、能耗、安防、环境和告警数据均由内置虚拟仿真器产生，其余业务功能均可真实操作、持久化、联动和导出。

## 启动项目

首次启动前复制 MySQL 配置文件并填写本机密码：

```powershell
Copy-Item .env.mysql.example .env
```

确认本机 MySQL 服务已启动后运行：

```powershell
npm install
npm run dev:full
```

- 前端：http://localhost:5173/
- 后端健康检查：http://localhost:3001/api/health

## 演示账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 系统管理员 | `admin` | `admin123` |
| 运营管理人员 | `operator` | `operator123` |
| 物业运维人员 | `engineer` | `engineer123` |
| 安防值班人员 | `security` | `security123` |
| 能源管理人员 | `energy` | `energy123` |

## 完整功能

### 数字孪生与虚拟仿真

- Three.js 园区三维场景、建筑拾取、图层控制和对象详情
- 虚拟设备实时遥测、运行状态、健康评分和 WebSocket 推送
- 日常运营、冷却泵故障、消防火警、能耗突增、水浸、异常通行场景
- 仿真器启停、速度控制、周期自动告警和一键恢复

### 运营管理

- 设备台账、虚拟设备控制、巡检计划、维保计划
- 能耗总览、趋势分析、楼栋排行、企业费用账单
- 视频监控、摄像头管理、访客、车辆、门禁通行记录
- 环境热力图、环境点位、阈值规则

### 服务管理

- 工单创建、派单、接单、处理、验收、完成和关闭
- 企业档案、服务申请、通知公告
- 楼栋、房间、租赁状态和合同管理

### 治理与系统

- 告警确认、关闭、三维定位、生成工单和联动规则
- 运营、设备、能耗、告警和工单 CSV 报表导出
- JWT 登录、RBAC 菜单与接口权限
- 用户、角色、数据字典、虚拟接口、审计日志管理
- 一键恢复初始演示数据

## 数据持久化

正式运行默认使用 MySQL。后端启动时会自动创建数据库和数据表：

```text
数据库：twinparkos
数据表：app_store
```

所有业务新增、编辑、删除、流程状态和审计日志都会写入 MySQL，并在写入成功后才向前端返回成功结果。首次建库时会导入内置演示数据。需要恢复初始演示数据时，可在系统管理中点击“重置演示数据”，或停止服务后执行：

```powershell
npm run reset:dev-data
```

## 验证命令

```powershell
npm run build
npm run test:api
npm run test:e2e
```

`test:api` 会验证登录、Bootstrap 数据、通用 CRUD、虚拟设备控制、场景仿真、权限边界、工单状态流转和报表导出。

`test:e2e` 需要项目已经通过 `npm run dev:full` 启动，会使用本机 Chrome / Edge 验证登录、全局搜索、三维工具、工单详情、Canvas 渲染和移动端布局。也可以通过 `BROWSER_PATH` 指定 Chromium 可执行文件。

测试中的数据迁移单元测试会显式使用隔离的 JSON 测试存储，不影响正式 MySQL 数据。

## 版本管理

仓库地址：https://github.com/fuoes/TwinParkOS

日常开发建议使用功能分支：

```powershell
git switch -c feature/功能名称
git add .
git commit -m "描述本次修改"
git push -u origin feature/功能名称
```

## 数据库结构

当前项目实际使用的 MySQL 建库脚本位于：

```text
db/mysql-store-schema.sql
```

面向后续时序数据扩展的 PostgreSQL 与 TimescaleDB 参考结构位于：

```text
db/postgres-timescale-schema.sql
```
