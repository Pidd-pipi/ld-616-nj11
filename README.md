# 设备计量校准排期 API 服务

面向实验室和工厂的计量设备校准周期管理 API，覆盖设备台账、校准计划、证书、超期预警和外部机构管理。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

后端健康检查：<http://localhost:21116/health>

后端健康检查：<http://localhost:21116/health>

### 排期看板与改期

- `GET /api/calibration-plan/schedule-board`：排期看板，返回设备、机构、计划及当前冲突（设备七天内重复、机构同日超过 2 项、设备/机构不可用）。
- `POST /api/calibration-plan/:id/reschedule`：单条改期。有冲突时返回 409 与逐条原因，原计划保持不变。

```bash
curl -X POST http://localhost:21116/api/calibration-plan/3/reschedule \
  -H 'Content-Type: application/json' \
  -d '{"planned_date":"2026-07-01T09:00:00Z","assigned_vendor_id":3}'
```

- `POST /api/calibration-plan/batch-reschedule`：批量改期，整批成功或全部保持原样；失败时返回 409 并逐条说明原因。

```bash
curl -X POST http://localhost:21116/api/calibration-plan/batch-reschedule \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"id":2,"planned_date":"2026-07-02T09:00:00Z","assigned_vendor_id":3},{"id":5,"planned_date":"2026-07-10T09:00:00Z","assigned_vendor_id":3}]}'
```

改期冲突规则（窗口天数、机构同日上限、双方可用状态）集中在 `backend/src/constants/ScheduleRules.ts`；成功的改期会写入审计日志（`CalibrationPlan.reschedule` / `CalibrationPlan.batchReschedule`，见 `constants/logTemplates.ts`）。

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

- DeviceCalibrationStatus: constants/DeviceCalibrationStatus、types/DeviceCalibrationStatus、constants/ScheduleRules（不可用状态列表）、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- PlanStatus: constants/PlanStatus、types/PlanStatus、constants/ScheduleRules（已终结状态列表）、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- CertificateResult: constants/CertificateResult、types/CertificateResult、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ScheduleRules: constants/ScheduleRules 定义改期冲突规则，被 services/ScheduleConflictService、services/CalibrationPlanService 引用；冲突原因码见 constants/errorCodes 与 constants/errorMessages。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
