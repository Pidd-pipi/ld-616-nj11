import { SCHEDULE_RULES } from "../constants/ScheduleRules";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { ScheduleConflictCode } from "../constants/ScheduleConflictCode";
import type { CalibrationPlan } from "../models/CalibrationPlan";
import type { MeasuringDevice } from "../models/MeasuringDevice";
import type { CalibrationVendor } from "../models/CalibrationVendor";
import type { ProspectivePlan, ScheduleConflict } from "../types/Scheduling";
import { daysBetween, renderTemplate, toUtcDay } from "../utils/formatters";

const isActivePlan = (plan: CalibrationPlan): boolean =>
  (SCHEDULE_RULES.ACTIVE_PLAN_STATUSES as readonly string[]).includes(plan.status);

const buildConflict = (
  code: ScheduleConflictCode,
  message: string,
  plan: Pick<CalibrationPlan, "id" | "device_id" | "assigned_vendor_id">,
  relatedPlanIds: number[] = []
): ScheduleConflict => ({
  code,
  message,
  plan_id: plan.id,
  device_id: plan.device_id,
  vendor_id: plan.assigned_vendor_id ?? null,
  related_plan_ids: relatedPlanIds
});

export interface ProspectiveChange {
  id: number;
  device_id: number;
  planned_date: string;
  assigned_vendor_id: number | null;
}

export const scheduleConflictService = {
  isDeviceAvailable: (device: MeasuringDevice): boolean =>
    (SCHEDULE_RULES.AVAILABLE_DEVICE_STATUSES as readonly string[]).includes(device.status),

  isVendorAvailable: (vendor: CalibrationVendor): boolean =>
    (SCHEDULE_RULES.AVAILABLE_VENDOR_STATUSES as readonly string[]).includes(vendor.vendor_status),

  /**
   * 针对一个“拟改期”的计划检查冲突。
   * - plans: 参与计算的计划集合（批量改期时包含尚未落库的虚拟计划）
   * - change 自身（按 id）被排除，模拟改期后的排期
   */
  findProspectiveConflicts(
    plans: readonly ProspectivePlan[],
    change: ProspectiveChange,
    context: { device?: MeasuringDevice; vendor?: CalibrationVendor }
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const target: CalibrationPlan = {
      id: change.id,
      device_id: change.device_id,
      planned_date: change.planned_date,
      plan_type: "",
      priority: "",
      status: "PLANNED",
      assigned_vendor_id: (change.assigned_vendor_id ?? 0) as number,
      created_by: ""
    };

    if (context.device && !this.isDeviceAvailable(context.device)) {
      conflicts.push(
        buildConflict(
          "DEVICE_UNAVAILABLE",
          renderTemplate(ERROR_MESSAGES.DEVICE_UNAVAILABLE, {
            deviceId: change.device_id,
            status: context.device.status
          }),
          target
        )
      );
    }

    if (change.assigned_vendor_id !== null) {
      if (context.vendor && !this.isVendorAvailable(context.vendor)) {
        conflicts.push(
          buildConflict(
            "VENDOR_UNAVAILABLE",
            renderTemplate(ERROR_MESSAGES.VENDOR_UNAVAILABLE, {
              vendorId: change.assigned_vendor_id,
              status: context.vendor.vendor_status
            }),
            target
          )
        );
      }

      const sameDayPlans = plans.filter(
        (plan) =>
          plan.id !== change.id &&
          isActivePlan(plan) &&
          plan.assigned_vendor_id === change.assigned_vendor_id &&
          toUtcDay(plan.planned_date) === toUtcDay(change.planned_date)
      );
      // 同日已有计划达到上限(2)时，再排入第 3 项即冲突
      if (sameDayPlans.length >= SCHEDULE_RULES.VENDOR_DAILY_PLAN_LIMIT) {
        conflicts.push(
          buildConflict(
            "VENDOR_DAILY_LIMIT_EXCEEDED",
            renderTemplate(ERROR_MESSAGES.VENDOR_DAILY_LIMIT_EXCEEDED, {
              vendorId: change.assigned_vendor_id,
              count: sameDayPlans.length,
              date: toUtcDay(change.planned_date),
              limit: SCHEDULE_RULES.VENDOR_DAILY_PLAN_LIMIT
            }),
            target,
            sameDayPlans.map((plan) => plan.id)
          )
        );
      }
    }

    const nearbyPlans = plans.filter(
      (plan) =>
        plan.id !== change.id &&
        isActivePlan(plan) &&
        plan.device_id === change.device_id &&
        daysBetween(plan.planned_date, change.planned_date) < SCHEDULE_RULES.DEVICE_DUPLICATE_WINDOW_DAYS
    );
    if (nearbyPlans.length > 0) {
      conflicts.push(
        buildConflict(
          "DEVICE_DUPLICATE_WITHIN_7_DAYS",
          renderTemplate(ERROR_MESSAGES.DEVICE_DUPLICATE_WITHIN_7_DAYS, {
            deviceId: change.device_id,
            windowDays: SCHEDULE_RULES.DEVICE_DUPLICATE_WINDOW_DAYS,
            relatedIds: nearbyPlans.map((plan) => `#${plan.id}`).join(", ")
          }),
          target,
          nearbyPlans.map((plan) => plan.id)
        )
      );
    }

    return conflicts;
  },

  /** 扫描当前整张排期表上既有的冲突（设备/机构不可用不会在看板重复，仅展示排期性冲突） */
  findBoardConflicts(
    plans: readonly CalibrationPlan[],
    devices: readonly MeasuringDevice[],
    vendors: readonly CalibrationVendor[]
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const activePlans = plans.filter(isActivePlan);

    activePlans.forEach((plan) => {
      const device = devices.find((row) => row.id === plan.device_id);
      if (device && !this.isDeviceAvailable(device)) {
        conflicts.push(
          buildConflict(
            "DEVICE_UNAVAILABLE",
            renderTemplate(ERROR_MESSAGES.DEVICE_UNAVAILABLE, {
              deviceId: device.id,
              status: device.status
            }),
            plan
          )
        );
      }

      const vendor = vendors.find((row) => row.id === plan.assigned_vendor_id);
      if (vendor && !this.isVendorAvailable(vendor)) {
        conflicts.push(
          buildConflict(
            "VENDOR_UNAVAILABLE",
            renderTemplate(ERROR_MESSAGES.VENDOR_UNAVAILABLE, {
              vendorId: vendor.id,
              status: vendor.vendor_status
            }),
            plan
          )
        );
      }

      const nearby = activePlans.filter(
        (other) =>
          other.id !== plan.id &&
          other.device_id === plan.device_id &&
          daysBetween(other.planned_date, plan.planned_date) < SCHEDULE_RULES.DEVICE_DUPLICATE_WINDOW_DAYS
      );
      if (nearby.length > 0) {
        conflicts.push(
          buildConflict(
            "DEVICE_DUPLICATE_WITHIN_7_DAYS",
            renderTemplate(ERROR_MESSAGES.DEVICE_DUPLICATE_WITHIN_7_DAYS, {
              deviceId: plan.device_id,
              windowDays: SCHEDULE_RULES.DEVICE_DUPLICATE_WINDOW_DAYS,
              relatedIds: nearby.map((row) => `#${row.id}`).join(", ")
            }),
            plan,
            nearby.map((row) => row.id)
          )
        );
      }

      if (plan.assigned_vendor_id) {
        const sameDay = activePlans.filter(
          (other) =>
            other.id !== plan.id &&
            other.assigned_vendor_id === plan.assigned_vendor_id &&
            toUtcDay(other.planned_date) === toUtcDay(plan.planned_date)
        );
        // 第 3 项及之后全部标记为超量
        if (sameDay.length >= SCHEDULE_RULES.VENDOR_DAILY_PLAN_LIMIT) {
          conflicts.push(
            buildConflict(
              "VENDOR_DAILY_LIMIT_EXCEEDED",
              renderTemplate(ERROR_MESSAGES.VENDOR_DAILY_LIMIT_EXCEEDED, {
                vendorId: plan.assigned_vendor_id,
                count: sameDay.length,
                date: toUtcDay(plan.planned_date),
                limit: SCHEDULE_RULES.VENDOR_DAILY_PLAN_LIMIT
              }),
              plan,
              sameDay.map((row) => row.id)
            )
          );
        }
      }
    });

    return conflicts;
  }
};
