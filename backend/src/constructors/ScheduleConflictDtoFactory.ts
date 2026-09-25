import type { ScheduleConflict } from "../types/Scheduling";

export const createScheduleConflictDto = (overrides: Partial<ScheduleConflict> = {}): ScheduleConflict => ({
  code: "DEVICE_DUPLICATE_WITHIN_7_DAYS",
  message: "conflict message",
  plan_id: 1,
  device_id: 1,
  vendor_id: 1,
  related_plan_ids: [],
  ...overrides
});
