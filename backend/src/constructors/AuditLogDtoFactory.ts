import type { AuditLog } from "../models/AuditLog";

export const createAuditLogDto = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 1,
  actor: "admin",
  action: "CalibrationPlan.reschedule",
  target_type: "CalibrationPlan",
  target_id: "CalibrationPlan#1",
  detail: "{}",
  created_at: "2026-09-25T09:00:00Z",
  ...overrides
});
