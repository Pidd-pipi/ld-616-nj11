import { auditLogRepository } from "../repositories/AuditLogRepository";
import { toAuditTarget } from "../utils/formatters";
import type { AuditLog } from "../models/AuditLog";

export interface RescheduleAuditDetail {
  from: { planned_date: string; assigned_vendor_id: number | null };
  to: { planned_date: string; assigned_vendor_id: number | null };
  batch?: boolean;
}

export const auditLogService = {
  list: (): readonly AuditLog[] => auditLogRepository.findAll(),

  recordReschedule: (params: {
    actor: string;
    planId: number;
    action: string;
    detail: RescheduleAuditDetail;
  }): AuditLog =>
    auditLogRepository.append({
      actor: params.actor,
      action: params.action,
      target_type: "CalibrationPlan",
      target_id: toAuditTarget("CalibrationPlan", params.planId),
      detail: JSON.stringify(params.detail)
    })
};
