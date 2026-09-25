import type { BatchRescheduleItemResult, BatchRescheduleResult, RescheduleResult } from "../types/Scheduling";
import { createCalibrationPlanDto } from "./CalibrationPlanDtoFactory";
import { createScheduleConflictDto } from "./ScheduleConflictDtoFactory";

export const createRescheduleResultDto = (overrides: Partial<RescheduleResult> = {}): RescheduleResult => ({
  plan: createCalibrationPlanDto(),
  conflicts: [],
  ...overrides
});

export const createBatchRescheduleItemResultDto = (
  overrides: Partial<BatchRescheduleItemResult> = {}
): BatchRescheduleItemResult => ({
  id: 1,
  success: true,
  ...overrides
});

export const createBatchRescheduleResultDto = (
  overrides: Partial<BatchRescheduleResult> = {}
): BatchRescheduleResult => ({
  success: true,
  applied_count: 0,
  failed_count: 0,
  items: [createBatchRescheduleItemResultDto()],
  audit_log_ids: [],
  ...overrides
});

export const createFailedBatchItemDto = (
  id: number,
  reason: string,
  conflicts: BatchRescheduleItemResult["conflicts"] = undefined
): BatchRescheduleItemResult =>
  createBatchRescheduleItemResultDto({
    id,
    success: false,
    reason,
    ...(conflicts ? { conflicts } : {})
  });

export { createScheduleConflictDto };
