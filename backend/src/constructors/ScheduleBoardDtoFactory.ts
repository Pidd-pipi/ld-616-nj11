import type { ScheduleBoard, ScheduleBoardDevice, ScheduleBoardVendor } from "../types/Scheduling";
import { createScheduleConflictDto } from "./ScheduleConflictDtoFactory";
import { createCalibrationPlanDto } from "./CalibrationPlanDtoFactory";

export const createScheduleBoardDeviceDto = (overrides: Partial<ScheduleBoardDevice> = {}): ScheduleBoardDevice => ({
  id: 1,
  device_code: "device code 1",
  name: "name 1",
  owner_dept: "owner dept 1",
  status: "VALID",
  available: true,
  ...overrides
});

export const createScheduleBoardVendorDto = (overrides: Partial<ScheduleBoardVendor> = {}): ScheduleBoardVendor => ({
  id: 1,
  vendor_name: "vendor name 1",
  qualification_no: "qualification no 1",
  vendor_status: "VALID",
  available: true,
  ...overrides
});

export const createScheduleBoardDto = (overrides: Partial<ScheduleBoard> = {}): ScheduleBoard => ({
  generated_at: "2026-09-25T09:00:00Z",
  devices: [createScheduleBoardDeviceDto()],
  vendors: [createScheduleBoardVendorDto()],
  plans: [createCalibrationPlanDto()],
  conflicts: [createScheduleConflictDto()],
  ...overrides
});
