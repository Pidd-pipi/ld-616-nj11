import type { DeviceCalibrationStatus } from "./DeviceCalibrationStatus";
import type { PlanStatus } from "./PlanStatus";

// 设备不可排期状态：取值必须属于 DeviceCalibrationStatus 枚举，新增枚举值需同步此处
const deviceUnavailableStatuses: DeviceCalibrationStatus[] = ["CALIBRATING", "SCRAPPED"];
// 已终结的计划状态不参与冲突检测：取值必须属于 PlanStatus 枚举
const inactivePlanStatuses: PlanStatus[] = ["CLOSED", "CANCELLED"];

export const DEVICE_UNAVAILABLE_STATUSES: string[] = deviceUnavailableStatuses;
export const INACTIVE_PLAN_STATUSES: string[] = inactivePlanStatuses;
// 机构可排期状态（vendor_status），不在列表内视为机构不可用
export const VENDOR_AVAILABLE_STATUSES: string[] = ["VALID", "ACTIVE"];
export const SCHEDULE_RULES = {
  DEVICE_DUPLICATE_WINDOW_DAYS: 7,
  VENDOR_MAX_PLANS_PER_DAY: 2,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;
