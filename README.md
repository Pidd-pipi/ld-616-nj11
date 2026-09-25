# 设备计量校准排期 API 服务

面向实验室和工厂的计量设备校准周期管理 API，覆盖设备台账、校准计划、证书、超期预警和外部机构管理。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

后端健康检查：<http://localhost:21116/health>

### 校准排期接口（挂在 `/api/calibration-plan`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/calibration-plan/schedule-board` | 排期看板：返回设备清单（含可用状态）、机构清单（含可用状态）、现有计划与全部冲突 |
| POST | `/api/calibration-plan/:id/reschedule` | 单条改期：校验设备 7 天内重复、机构同日超 2 项、设备/机构可用状态；存在冲突返回 409 且原计划不变，成功返回改后计划并写审计日志 |
| POST | `/api/calibration-plan/batch-reschedule` | 批量改期：`{"items":[{"id":1,"planned_date":"...","assigned_vendor_id":3}]}`；整批成功或全部保持原样，409 响应的 `details.result.items` 逐条说明失败原因，成功的改动逐条写审计日志 |

冲突码（`constants/ScheduleConflictCode.ts`）：

- `DEVICE_DUPLICATE_WITHIN_7_DAYS`：同一设备 7 天窗口内已有进行中计划
- `VENDOR_DAILY_LIMIT_EXCEEDED`：同一机构同一天已有 2 项，第 3 项起冲突
- `DEVICE_UNAVAILABLE`：设备处于 CALIBRATING / SCRAPPED 状态
- `VENDOR_UNAVAILABLE`：机构资质状态为 OVERDUE（仅 VALID / DUE_SOON 可承接）

排期规则常量集中在 `backend/src/constants/ScheduleRules.ts`，可调整窗口天数、同日上限与可用状态白名单；冲突检测逻辑在 `backend/src/services/ScheduleConflictService.ts`，批量改期在虚拟排期上逐条预演以保证整批原子性。


## 本地开发方式


- 后端：进入 `backend` 后按技术栈运行开发命令，接口统一挂在 `/api`。


## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | - |
| 后端 | NestJS + TypeScript + TypeORM |
| 数据库 | PostgreSQL 15 |
| 部署 | Docker Compose |

## 项目目录结构

```text

backend/src/routes, controllers, services, models, repositories, middlewares, constants, constructors, utils, types, config
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `calibration-api`

- `BACKEND_PORT`: 后端端口，默认 `21116`
- `DB_PORT`: 数据库宿主机端口
- `DB_USER/DB_PASSWORD/DB_NAME`: 本地数据库凭据

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: calibration-api`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-calibration-api}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- DeviceCalibrationStatus: constants/DeviceCalibrationStatus、types/DeviceCalibrationStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- PlanStatus: constants/PlanStatus、types/PlanStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- CertificateResult: constants/CertificateResult、types/CertificateResult、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
