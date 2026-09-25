import { calibrationVendorRepository } from "../repositories/CalibrationVendorRepository";
import { measuringDeviceRepository } from "../repositories/MeasuringDeviceRepository";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { DEVICE_UNAVAILABLE_STATUSES, INACTIVE_PLAN_STATUSES, SCHEDULE_RULES, VENDOR_AVAILABLE_STATUSES } from "../constants/ScheduleRules";
import { toUtcDay } from "../utils/formatters";
import type { CalibrationPlan } from "../models/CalibrationPlan";
import type { BoardConflict, ConflictReason } from "../types/ScheduleConflict";

export type PlacementCheck = { planId: number; deviceId: number; vendorId: number; date: string; plans: CalibrationPlan[] };

const isActivePlan = (plan: CalibrationPlan) => !INACTIVE_PLAN_STATUSES.includes(plan.status);

const withinDeviceWindow = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= SCHEDULE_RULES.DEVICE_DUPLICATE_WINDOW_DAYS * SCHEDULE_RULES.MS_PER_DAY;

export const scheduleConflictService = {
  // 改期冲突检测：设备七天内重复、机构同日超过 2 项、设备与机构双方可用状态
  checkPlacement: (input: PlacementCheck): ConflictReason[] => {
    const reasons: ConflictReason[] = [];
    const device = measuringDeviceRepository.findById(input.deviceId);
    if (!device) {
      reasons.push({ code: ERROR_CODES.DEVICE_NOT_FOUND, message: ERROR_MESSAGES.DEVICE_NOT_FOUND });
    } else if (DEVICE_UNAVAILABLE_STATUSES.includes(device.status)) {
      reasons.push({ code: ERROR_CODES.DEVICE_UNAVAILABLE, message: ERROR_MESSAGES.DEVICE_UNAVAILABLE });
    }
    const vendor = calibrationVendorRepository.findById(input.vendorId);
    if (!vendor) {
      reasons.push({ code: ERROR_CODES.VENDOR_NOT_FOUND, message: ERROR_MESSAGES.VENDOR_NOT_FOUND });
    } else if (!VENDOR_AVAILABLE_STATUSES.includes(vendor.vendor_status)) {
      reasons.push({ code: ERROR_CODES.VENDOR_UNAVAILABLE, message: ERROR_MESSAGES.VENDOR_UNAVAILABLE });
    }
    const others = input.plans.filter((plan) => plan.id !== input.planId && isActivePlan(plan));
    if (others.some((plan) => plan.device_id === input.deviceId && withinDeviceWindow(plan.planned_date, input.date))) {
      reasons.push({ code: ERROR_CODES.DEVICE_DUPLICATE_7D, message: ERROR_MESSAGES.DEVICE_DUPLICATE_7D });
    }
    const day = toUtcDay(input.date);
    const sameDayCount = others.filter((plan) => plan.assigned_vendor_id === input.vendorId && toUtcDay(plan.planned_date) === day).length;
    if (sameDayCount >= SCHEDULE_RULES.VENDOR_MAX_PLANS_PER_DAY) {
      reasons.push({ code: ERROR_CODES.VENDOR_DAY_OVERLOAD, message: ERROR_MESSAGES.VENDOR_DAY_OVERLOAD });
    }
    return reasons;
  },

  // 看板冲突：对当前全部生效计划扫描同一套规则
  findBoardConflicts: (plans: CalibrationPlan[]): BoardConflict[] => {
    const conflicts: BoardConflict[] = [];
    const active = plans.filter(isActivePlan);
    active.forEach((plan, index) => {
      active.slice(index + 1)
        .filter((other) => other.device_id === plan.device_id && withinDeviceWindow(plan.planned_date, other.planned_date))
        .forEach((other) => {
          conflicts.push({ type: ERROR_CODES.DEVICE_DUPLICATE_7D, message: ERROR_MESSAGES.DEVICE_DUPLICATE_7D, device_id: plan.device_id, plan_ids: [plan.id, other.id] });
        });
    });
    const byVendorDay = new Map<string, CalibrationPlan[]>();
    active.forEach((plan) => {
      const key = `${plan.assigned_vendor_id}|${toUtcDay(plan.planned_date)}`;
      byVendorDay.set(key, [...(byVendorDay.get(key) ?? []), plan]);
    });
    byVendorDay.forEach((group, key) => {
      if (group.length > SCHEDULE_RULES.VENDOR_MAX_PLANS_PER_DAY) {
        const [vendorId, day] = key.split("|");
        conflicts.push({ type: ERROR_CODES.VENDOR_DAY_OVERLOAD, message: ERROR_MESSAGES.VENDOR_DAY_OVERLOAD, vendor_id: Number(vendorId), date: day, plan_ids: group.map((plan) => plan.id) });
      }
    });
    active.forEach((plan) => {
      const device = measuringDeviceRepository.findById(plan.device_id);
      if (!device) {
        conflicts.push({ type: ERROR_CODES.DEVICE_NOT_FOUND, message: ERROR_MESSAGES.DEVICE_NOT_FOUND, device_id: plan.device_id, plan_ids: [plan.id] });
      } else if (DEVICE_UNAVAILABLE_STATUSES.includes(device.status)) {
        conflicts.push({ type: ERROR_CODES.DEVICE_UNAVAILABLE, message: ERROR_MESSAGES.DEVICE_UNAVAILABLE, device_id: plan.device_id, plan_ids: [plan.id] });
      }
      const vendor = calibrationVendorRepository.findById(plan.assigned_vendor_id);
      if (!vendor) {
        conflicts.push({ type: ERROR_CODES.VENDOR_NOT_FOUND, message: ERROR_MESSAGES.VENDOR_NOT_FOUND, vendor_id: plan.assigned_vendor_id, plan_ids: [plan.id] });
      } else if (!VENDOR_AVAILABLE_STATUSES.includes(vendor.vendor_status)) {
        conflicts.push({ type: ERROR_CODES.VENDOR_UNAVAILABLE, message: ERROR_MESSAGES.VENDOR_UNAVAILABLE, vendor_id: plan.assigned_vendor_id, plan_ids: [plan.id] });
      }
    });
    return conflicts;
  },
};
