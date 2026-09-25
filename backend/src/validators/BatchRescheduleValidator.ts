import type { BatchReschedulePayload, ReschedulePayload } from "../types/ReschedulePayload";
import { validateReschedulePayload, type ValidationIssue } from "./RescheduleValidator";

export interface BatchValidationFailure {
  index: number;
  issues: ValidationIssue[];
}

export interface BatchValidationSuccess {
  payload: BatchReschedulePayload;
}

/**
 * 校验批量改期入参，不抛异常而逐条返回问题：
 * 整批任一记录结构非法即视为整批无效。
 */
export const validateBatchReschedulePayload = (
  body: unknown
): BatchValidationSuccess | { failures: BatchValidationFailure[] } => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { failures: [{ index: -1, issues: [{ field: "body", message: "must be an object" }] }] };
  }
  const items = (body as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length === 0) {
    return { failures: [{ index: -1, issues: [{ field: "items", message: "must be a non-empty array" }] }] };
  }

  const failures: BatchValidationFailure[] = [];
  const seenIds = new Set<number>();
  const normalized: Array<{ id: number } & ReschedulePayload> = [];

  items.forEach((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      failures.push({ index, issues: [{ field: "item", message: "must be an object" }] });
      return;
    }
    const row = item as Record<string, unknown>;
    const issues: ValidationIssue[] = [];
    if (typeof row.id !== "number" || !Number.isInteger(row.id) || row.id <= 0) {
      issues.push({ field: "id", message: "must be a positive integer" });
    } else if (seenIds.has(row.id)) {
      issues.push({ field: "id", message: "duplicate plan id within the batch" });
    } else {
      seenIds.add(row.id);
    }
    const itemValidation = validateReschedulePayload(row);
    if (itemValidation.issues.length > 0) {
      issues.push(...itemValidation.issues);
    }
    if (issues.length > 0) {
      failures.push({ index, issues });
      return;
    }
    normalized.push({ id: row.id as number, ...(itemValidation.payload as ReschedulePayload) });
  });

  if (failures.length > 0) {
    return { failures };
  }
  return { payload: { items: normalized } };
};
