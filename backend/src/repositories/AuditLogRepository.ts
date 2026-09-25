import type { AuditLog } from "../models/AuditLog";

const auditLogs: AuditLog[] = [];

export interface AuditLogEntry {
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
}

export const auditLogRepository = {
  findAll: (): readonly AuditLog[] => auditLogs,
  append: (entry: AuditLogEntry): AuditLog => {
    const log: AuditLog = { id: auditLogs.length + 1, created_at: new Date().toISOString(), ...entry };
    auditLogs.push(log);
    return log;
  }
};
