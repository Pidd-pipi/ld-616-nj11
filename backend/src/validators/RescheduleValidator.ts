import type { ReschedulePayload } from "../types/ReschedulePayload";

export interface ValidationIssue {
  field: string;
  message: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIsoDateString = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const isPositiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** 校验单条改期入参，返回字段级问题列表；问题为空表示通过 */
export const validateReschedulePayload = (body: unknown): { issues: ValidationIssue[]; payload?: ReschedulePayload } => {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(body)) {
    return { issues: [{ field: "body", message: "must be an object" }] };
  }

  const hasPlannedDate = Object.prototype.hasOwnProperty.call(body, "planned_date");
  const hasVendor = Object.prototype.hasOwnProperty.call(body, "assigned_vendor_id");
  if (!hasPlannedDate && !hasVendor) {
    issues.push({ field: "body", message: "at least one of planned_date or assigned_vendor_id is required" });
  }
  if (hasPlannedDate && !isIsoDateString(body.planned_date)) {
    issues.push({ field: "planned_date", message: "must be an ISO 8601 date string" });
  }
  if (hasVendor && !isPositiveInt(body.assigned_vendor_id)) {
    issues.push({ field: "assigned_vendor_id", message: "must be a positive integer" });
  }
  if (issues.length > 0) {
    return { issues };
  }
  return {
    issues,
    payload: {
      ...(hasPlannedDate ? { planned_date: body.planned_date as string } : {}),
      ...(hasVendor ? { assigned_vendor_id: body.assigned_vendor_id as number } : {})
    }
  };
};
