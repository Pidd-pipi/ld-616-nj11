import type { CalibrationPlan } from "../models/CalibrationPlan";
import type { MeasuringDevice } from "../models/MeasuringDevice";
import type { CalibrationVendor } from "../models/CalibrationVendor";
import type { ScheduleConflictCode } from "../constants/ScheduleConflictCode";

export interface ScheduleConflict {
  code: ScheduleConflictCode;
  message: string;
  plan_id: number;
  device_id: number;
  vendor_id: number | null;
  related_plan_ids: number[];
}

export interface ScheduleBoardDevice {
  id: number;
  device_code: string;
  name: string;
  owner_dept: string;
  status: string;
  available: boolean;
}

export interface ScheduleBoardVendor {
  id: number;
  vendor_name: string;
  qualification_no: string;
  vendor_status: string;
  available: boolean;
}

export interface ScheduleBoard {
  generated_at: string;
  devices: ScheduleBoardDevice[];
  vendors: ScheduleBoardVendor[];
  plans: CalibrationPlan[];
  conflicts: ScheduleConflict[];
}

export interface RescheduleResult {
  plan: CalibrationPlan;
  conflicts: ScheduleConflict[];
  audit_log_id?: number;
}

export interface BatchRescheduleItemResult {
  id: number;
  success: boolean;
  planned_date?: string;
  assigned_vendor_id?: number;
  conflicts?: ScheduleConflict[];
  reason?: string;
  audit_log_id?: number;
}

export interface BatchRescheduleResult {
  success: boolean;
  applied_count: number;
  failed_count: number;
  items: BatchRescheduleItemResult[];
  audit_log_ids: number[];
}

export type ProspectivePlan = CalibrationPlan & { _virtual?: boolean };

export interface DeviceVendorContext {
  device: MeasuringDevice | undefined;
  vendor: CalibrationVendor | undefined;
}
