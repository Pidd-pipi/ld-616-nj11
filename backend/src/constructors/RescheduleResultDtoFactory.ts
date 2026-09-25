import type { CalibrationPlan } from "../models/CalibrationPlan";
import type { ConflictReason } from "../types/ScheduleConflict";

export type BatchItemResult = { id: number; ok: boolean; reasons: ConflictReason[] };

export const createRescheduleResultDto = (plan: CalibrationPlan) => ({ ok: true, plan });

export const createBatchItemResultDto = (id: number, ok: boolean, reasons: ConflictReason[] = []): BatchItemResult => ({ id, ok, reasons });

export const createBatchRescheduleResultDto = (applied: boolean, results: unknown[]) => ({ applied, results });
