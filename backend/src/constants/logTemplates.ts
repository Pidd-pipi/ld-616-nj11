export const LOG_TEMPLATES = {
  MeasuringDevice: ["MeasuringDevice.create", "MeasuringDevice.update", "MeasuringDevice.status", "MeasuringDevice.export"],
  CalibrationPlan: [
    "CalibrationPlan.create",
    "CalibrationPlan.update",
    "CalibrationPlan.status",
    "CalibrationPlan.export",
    "CalibrationPlan.scheduleBoard",
    "CalibrationPlan.reschedule",
    "CalibrationPlan.batchReschedule"
  ],
  CalibrationCertificate: ["CalibrationCertificate.create", "CalibrationCertificate.update", "CalibrationCertificate.status", "CalibrationCertificate.export"],
  CalibrationVendor: ["CalibrationVendor.create", "CalibrationVendor.update", "CalibrationVendor.status", "CalibrationVendor.export"],
  OverdueAlert: ["OverdueAlert.create", "OverdueAlert.update", "OverdueAlert.status", "OverdueAlert.export"],
  AuditLog: ["AuditLog.create", "AuditLog.list"]
};

export const CALIBRATION_PLAN_LOG_ACTIONS = {
  scheduleBoard: "CalibrationPlan.scheduleBoard",
  reschedule: "CalibrationPlan.reschedule",
  batchReschedule: "CalibrationPlan.batchReschedule"
} as const;
