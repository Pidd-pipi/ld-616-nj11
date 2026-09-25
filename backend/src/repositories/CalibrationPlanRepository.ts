import { seed } from "../seed";
import type { CalibrationPlan } from "../models/CalibrationPlan";

// 内存存储：从种子数据拷贝一份可写副本，改期/批量改期直接修改这里
const plans: CalibrationPlan[] = seed.calibrationPlan.map((row) => ({ ...row }));

const nextId = () => plans.reduce((max, plan) => Math.max(max, plan.id), 0) + 1;

export const calibrationPlanRepository = {
  findAll: (): CalibrationPlan[] => plans,
  findById: (id: number): CalibrationPlan | undefined => plans.find((row) => row.id === id),
  save: (row: unknown): CalibrationPlan => {
    const payload = (row ?? {}) as Partial<CalibrationPlan>;
    const record = { ...payload, id: payload.id ?? nextId() } as CalibrationPlan;
    plans.push(record);
    return record;
  },
  update: (id: number, patch: Partial<CalibrationPlan>): CalibrationPlan | undefined => {
    const index = plans.findIndex((row) => row.id === id);
    if (index === -1) return undefined;
    plans[index] = { ...plans[index], ...patch, id };
    return plans[index];
  },
};
