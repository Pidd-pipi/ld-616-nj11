import { PlanStatus } from "./PlanStatus";
import { DeviceCalibrationStatus } from "./DeviceCalibrationStatus";

/**
 * 校准排期业务规则：
 * - 同一设备 7 天内不得重复排期
 * - 同一机构同一天最多承接 2 项
 * - 仅进行中的计划状态占用排期；已关闭/已取消不参与冲突计算
 * - 设备在校准中(CALIBRATING)/已报废(SCRAPPED)不可排期
 * - 机构资质 VALID / 即将到期 DUE_SOON 可承接，已过期 OVERDUE 不可承接
 */
export const SCHEDULE_RULES = {
  DEVICE_DUPLICATE_WINDOW_DAYS: 7,
  VENDOR_DAILY_PLAN_LIMIT: 2,
  ACTIVE_PLAN_STATUSES: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] as PlanStatus[],
  AVAILABLE_DEVICE_STATUSES: ["VALID", "DUE_SOON", "OVERDUE"] as DeviceCalibrationStatus[],
  AVAILABLE_VENDOR_STATUSES: ["VALID", "DUE_SOON"] as DeviceCalibrationStatus[]
} as const;
