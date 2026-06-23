# TwinParkOS 本地 MySQL 配置说明

当前项目默认仍可使用 `server/data/dev-db.json` 作为零配置演示数据源。
如果需要改用本地 MySQL，请按下面方式启动。

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

## 2. 配置环境变量

PowerShell 示例：

```powershell
$env:TWINPARK_STORAGE="mysql"
$env:MYSQL_HOST="127.0.0.1"
$env:MYSQL_PORT="3306"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="你的MySQL密码"
$env:MYSQL_DATABASE="twinparkos"
$env:MYSQL_STORE_ID="main"
```

也可以复制根目录 `.env.mysql.example` 作为配置参考。

## 3. 启动项目

```powershell
npm run dev:full
```

启动后，后端会：

1. 自动连接本地 MySQL。
2. 自动创建 `twinparkos` 数据库和 `app_store` 表。
3. 如果表中没有数据，会从 `server/data/dev-db.json` 导入现有演示数据。
4. 后续设备、告警、工单、企业、空间、能耗、用户和权限等业务状态会写入 MySQL。

## 4. 恢复默认 JSON 模式

关闭当前终端后重新打开，或执行：

```powershell
Remove-Item Env:TWINPARK_STORAGE -ErrorAction SilentlyContinue
```

再运行：

```powershell
npm run dev:full
```

即可回到默认 JSON 文件持久化模式。
