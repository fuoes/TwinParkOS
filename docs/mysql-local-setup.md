# TwinParkOS 本地 MySQL 配置说明

当前项目正式运行默认使用本地 MySQL。JSON 存储仅用于隔离测试或显式兼容模式。

## 1. 创建数据库和表

后端在 MySQL 模式启动时会自动创建数据库和表，也可以手动执行：

```sql
SOURCE D:/__easyHelper__/TwinParkOS/db/mysql-store-schema.sql;
```

默认创建：

- 数据库：`twinparkos`
- 数据表：`app_store`
- 主键：`id`
- 数据列：`data`，使用 `LONGTEXT` 保存完整业务状态 JSON 字符串，兼容 MySQL 5.5+

## 2. 配置 `.env`

复制配置模板：

```powershell
Copy-Item .env.mysql.example .env
```

打开 `.env`，将 `MYSQL_PASSWORD` 修改为本机 MySQL 密码。`.env` 已被 Git 忽略，不会提交账号密码。

## 3. 启动项目

```powershell
npm run dev:full
```

启动后，后端会：

1. 自动连接本地 MySQL。
2. 自动创建 `twinparkos` 数据库和 `app_store` 表。
3. 如果表中没有数据，会从 `server/data/dev-db.json` 导入现有演示数据。
4. 后续设备、告警、工单、企业、空间、能耗、用户和权限等业务状态会写入 MySQL。

## 4. 仅在测试中使用 JSON 模式

需要临时运行隔离测试存储时，可显式设置：

```powershell
$env:TWINPARK_STORAGE="json"
```
