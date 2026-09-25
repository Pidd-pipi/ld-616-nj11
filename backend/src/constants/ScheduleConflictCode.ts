export const ScheduleConflictCode = [
  "DEVICE_DUPLICATE_WITHIN_7_DAYS",
  "VENDOR_DAILY_LIMIT_EXCEEDED",
  "DEVICE_UNAVAILABLE",
  "VENDOR_UNAVAILABLE"
] as const;
export type ScheduleConflictCode = (typeof ScheduleConflictCode)[number];
