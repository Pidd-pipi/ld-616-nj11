import { seed } from "../seed";
import type { CalibrationPlan } from "../models/CalibrationPlan";
import type { ReschedulePayload } from "../types/ReschedulePayload";

// 从种子数据复制出可变的内存计划表，改期操作直接作用于该副本
const plans: CalibrationPlan[] = seed.calibrationPlan.map((row) => ({ ...row }));

export const calibrationPlanRepository = {
  findAll: (): readonly CalibrationPlan[] => plans,
  findById: (id: number): CalibrationPlan | undefined => plans.find((plan) => plan.id === id),
  save: (row: unknown) => row,
  update: (id: number, patch: ReschedulePayload): CalibrationPlan | undefined => {
    const plan = plans.find((row) => row.id === id);
    if (!plan) {
      return undefined;
    }
    if (patch.planned_date !== undefined) {
      plan.planned_date = patch.planned_date;
    }
    if (patch.assigned_vendor_id !== undefined) {
      plan.assigned_vendor_id = patch.assigned_vendor_id;
    }
    return plan;
  }
};
