import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { httpError } from "../utils/httpError";
import type { BatchRescheduleItem } from "../types/BatchReschedulePayload";
import type { ReschedulePayload } from "../types/ReschedulePayload";

const isValidDate = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

const invalid = (field: string) => httpError(400, ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, { field });

export const validateReschedulePayload = (body: any): ReschedulePayload => {
  if (!body || !isValidDate(body.planned_date)) throw invalid("planned_date");
  if (body.assigned_vendor_id !== undefined && !Number.isInteger(body.assigned_vendor_id)) throw invalid("assigned_vendor_id");
  return { planned_date: body.planned_date, assigned_vendor_id: body.assigned_vendor_id };
};

export const validateBatchReschedulePayload = (body: any): BatchRescheduleItem[] => {
  if (!body || !Array.isArray(body.items) || body.items.length === 0) throw invalid("items");
  // 单条记录的格式问题不在此处抛出，交由 service 逐条记录失败原因，保证整批原子性
  return body.items;
};
