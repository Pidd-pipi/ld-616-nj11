export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "missing bearer token",
  RBAC_DENIED: "role denied",
  VALIDATION_FAILED: "invalid payload",
  RATE_LIMITED: "too many requests",
  INTERNAL_ERROR: "internal server error",
  PLAN_NOT_FOUND: "calibration plan #{{id}} not found",
  DEVICE_NOT_FOUND: "measuring device #{{id}} not found",
  VENDOR_NOT_FOUND: "calibration vendor #{{id}} not found",
  RESCHEDULE_CONFLICT: "reschedule rejected: scheduling conflict, the original plan is unchanged",
  BATCH_RESCHEDULE_FAILED: "batch reschedule rejected: {{failed}} of {{total}} item(s) failed, no plan was changed",
  DEVICE_DUPLICATE_WITHIN_7_DAYS: "device #{{deviceId}} is already scheduled within {{windowDays}} days (related plans: {{relatedIds}})",
  VENDOR_DAILY_LIMIT_EXCEEDED: "vendor #{{vendorId}} already has {{count}} plan(s) on {{date}}, daily limit is {{limit}}",
  DEVICE_UNAVAILABLE: "device #{{deviceId}} is unavailable, current status is {{status}}",
  VENDOR_UNAVAILABLE: "vendor #{{vendorId}} is unavailable, current status is {{status}}"
};
