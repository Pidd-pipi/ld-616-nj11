import { calibrationPlanRepository } from "../repositories/CalibrationPlanRepository";
import { measuringDeviceRepository } from "../repositories/MeasuringDeviceRepository";
import { calibrationVendorRepository } from "../repositories/CalibrationVendorRepository";
import { scheduleConflictService, type ProspectiveChange } from "./ScheduleConflictService";
import { auditLogService } from "./AuditLogService";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { CALIBRATION_PLAN_LOG_ACTIONS } from "../constants/logTemplates";
import { validateReschedulePayload } from "../validators/RescheduleValidator";
import { validateBatchReschedulePayload } from "../validators/BatchRescheduleValidator";
import { createScheduleBoardDto } from "../constructors/ScheduleBoardDtoFactory";
import { createRescheduleResultDto, createBatchRescheduleResultDto, createFailedBatchItemDto } from "../constructors/RescheduleResultDtoFactory";
import type { CalibrationPlan } from "../models/CalibrationPlan";
import type { BatchReschedulePayload, ReschedulePayload } from "../types/ReschedulePayload";
import type { BatchRescheduleItemResult, BatchRescheduleResult, ProspectivePlan, ScheduleBoard, ScheduleConflict } from "../types/Scheduling";
import { AppError } from "../utils/AppError";
import { renderTemplate } from "../utils/formatters";

const notFound = (code: string, message: string) => new AppError(404, code, message);

export const calibrationPlanService = {
  list: () => calibrationPlanRepository.findAll(),
  create: (row: unknown) => calibrationPlanRepository.save(row),

  /** 排期看板：返回设备、机构、现有计划与全部冲突 */
  getScheduleBoard(): ScheduleBoard {
    const devices = measuringDeviceRepository.findAll();
    const vendors = calibrationVendorRepository.findAll();
    const plans = calibrationPlanRepository.findAll();
    const conflicts = scheduleConflictService.findBoardConflicts(plans, devices, vendors);
    return createScheduleBoardDto({
      generated_at: new Date().toISOString(),
      devices: devices.map((device) => ({
        id: device.id,
        device_code: device.device_code,
        name: device.name,
        owner_dept: device.owner_dept,
        status: device.status,
        available: scheduleConflictService.isDeviceAvailable(device)
      })),
      vendors: vendors.map((vendor) => ({
        id: vendor.id,
        vendor_name: vendor.vendor_name,
        qualification_no: vendor.qualification_no,
        vendor_status: vendor.vendor_status,
        available: scheduleConflictService.isVendorAvailable(vendor)
      })),
      plans: plans.map((plan) => ({ ...plan })),
      conflicts
    });
  },

  /** 单条改期：存在任一冲突时拒绝，原计划保持不变 */
  reschedule(id: number, body: unknown, actor: string) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, {
        field: "id",
        message: "must be a positive integer"
      });
    }

    const { issues, payload } = validateReschedulePayload(body);
    if (issues.length > 0) {
      throw new AppError(400, ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, { issues });
    }
    const patch = payload as ReschedulePayload;

    const plan = calibrationPlanRepository.findById(id);
    if (!plan) {
      throw notFound(
        ERROR_CODES.PLAN_NOT_FOUND,
        renderTemplate(ERROR_MESSAGES.PLAN_NOT_FOUND, { id })
      );
    }

    const device = measuringDeviceRepository.findById(plan.device_id);
    if (!device) {
      throw notFound(
        ERROR_CODES.DEVICE_NOT_FOUND,
        renderTemplate(ERROR_MESSAGES.DEVICE_NOT_FOUND, { id: plan.device_id })
      );
    }

    const nextVendorId = patch.assigned_vendor_id ?? plan.assigned_vendor_id;
    const vendor = calibrationVendorRepository.findById(nextVendorId);
    if (!vendor) {
      throw notFound(
        ERROR_CODES.VENDOR_NOT_FOUND,
        renderTemplate(ERROR_MESSAGES.VENDOR_NOT_FOUND, { id: nextVendorId })
      );
    }

    const change: ProspectiveChange = {
      id: plan.id,
      device_id: plan.device_id,
      planned_date: patch.planned_date ?? plan.planned_date,
      assigned_vendor_id: nextVendorId
    };
    const conflicts = scheduleConflictService.findProspectiveConflicts(
      calibrationPlanRepository.findAll(),
      change,
      { device, vendor }
    );
    if (conflicts.length > 0) {
      // 冲突：不触碰原计划
      throw new AppError(409, ERROR_CODES.RESCHEDULE_CONFLICT, ERROR_MESSAGES.RESCHEDULE_CONFLICT, {
        conflicts
      });
    }

    const before = {
      planned_date: plan.planned_date,
      assigned_vendor_id: plan.assigned_vendor_id ?? null
    };
    const updated = calibrationPlanRepository.update(id, patch) as CalibrationPlan;
    const auditLog = auditLogService.recordReschedule({
      actor,
      planId: id,
      action: CALIBRATION_PLAN_LOG_ACTIONS.reschedule,
      detail: {
        from: before,
        to: { planned_date: updated.planned_date, assigned_vendor_id: updated.assigned_vendor_id ?? null }
      }
    });

    return createRescheduleResultDto({
      plan: { ...updated },
      conflicts: [],
      audit_log_id: auditLog.id
    });
  },

  /**
   * 批量改期：整批成功或全部保持原样。
   * 先在虚拟排期上逐条校验冲突，任一失败则不落库；全部通过后统一更新并逐条写审计日志。
   */
  batchReschedule(body: unknown, actor: string): BatchRescheduleResult {
    const validation = validateBatchReschedulePayload(body);
    if ("failures" in validation) {
      throw new AppError(400, ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, {
        failures: validation.failures
      });
    }
    const { payload }: { payload: BatchReschedulePayload } = validation;

    const currentPlans = calibrationPlanRepository.findAll();
    const results: BatchRescheduleItemResult[] = [];
    // 虚拟排期：随逐条预演推进，模拟整批改完后的状态
    const prospectivePlans: ProspectivePlan[] = currentPlans.map((plan) => ({ ...plan, _virtual: false }));
    let hasFailure = false;

    for (const item of payload.items) {
      const plan = calibrationPlanRepository.findById(item.id);
      if (!plan) {
        hasFailure = true;
        results.push(
          createFailedBatchItemDto(
            item.id,
            renderTemplate(ERROR_MESSAGES.PLAN_NOT_FOUND, { id: item.id })
          )
        );
        continue;
      }

      const device = measuringDeviceRepository.findById(plan.device_id);
      if (!device) {
        hasFailure = true;
        results.push(
          createFailedBatchItemDto(
            item.id,
            renderTemplate(ERROR_MESSAGES.DEVICE_NOT_FOUND, { id: plan.device_id })
          )
        );
        continue;
      }

      const nextVendorId = item.assigned_vendor_id ?? plan.assigned_vendor_id;
      const vendor = calibrationVendorRepository.findById(nextVendorId);
      if (!vendor) {
        hasFailure = true;
        results.push(
          createFailedBatchItemDto(
            item.id,
            renderTemplate(ERROR_MESSAGES.VENDOR_NOT_FOUND, { id: nextVendorId })
          )
        );
        continue;
      }

      const nextPlannedDate = item.planned_date ?? plan.planned_date;
      const change: ProspectiveChange = {
        id: plan.id,
        device_id: plan.device_id,
        planned_date: nextPlannedDate,
        assigned_vendor_id: nextVendorId
      };
      const conflicts: ScheduleConflict[] = scheduleConflictService.findProspectiveConflicts(
        prospectivePlans,
        change,
        { device, vendor }
      );
      if (conflicts.length > 0) {
        hasFailure = true;
        const reason = conflicts.map((conflict) => conflict.message).join("; ");
        results.push(createFailedBatchItemDto(item.id, reason, conflicts));
        continue;
      }

      // 预演通过：更新虚拟排期中的该计划，供后续条目计算
      const virtualPlan = prospectivePlans.find((row) => row.id === item.id);
      if (virtualPlan) {
        virtualPlan.planned_date = nextPlannedDate;
        virtualPlan.assigned_vendor_id = nextVendorId;
        virtualPlan._virtual = true;
      }
      results.push(
        createBatchResultSuccess(item.id, nextPlannedDate, nextVendorId)
      );
    }

    if (hasFailure) {
      // 整批失败：不更新任何计划，不写审计日志，逐条说明原因
      const failedResults = payload.items.map((item, index) => {
        const existing = results[index];
        return existing ?? createFailedBatchItemDto(item.id, ERROR_MESSAGES.RESCHEDULE_CONFLICT);
      });
      const result = createBatchRescheduleResultDto({
        success: false,
        applied_count: 0,
        failed_count: failedResults.filter((row) => !row.success).length,
        items: failedResults,
        audit_log_ids: []
      });
      throw new AppError(
        409,
        ERROR_CODES.BATCH_RESCHEDULE_FAILED,
        renderTemplate(ERROR_MESSAGES.BATCH_RESCHEDULE_FAILED, {
          failed: result.failed_count,
          total: payload.items.length
        }),
        { result }
      );
    }

    // 全部通过：统一落库并逐条记录审计日志
    const auditLogIds: number[] = [];
    payload.items.forEach((item, index) => {
      const plan = calibrationPlanRepository.findById(item.id) as CalibrationPlan;
      const before = {
        planned_date: plan.planned_date,
        assigned_vendor_id: plan.assigned_vendor_id ?? null
      };
      const updated = calibrationPlanRepository.update(item.id, item) as CalibrationPlan;
      const auditLog = auditLogService.recordReschedule({
        actor,
        planId: item.id,
        action: CALIBRATION_PLAN_LOG_ACTIONS.batchReschedule,
        detail: {
          from: before,
          to: {
            planned_date: updated.planned_date,
            assigned_vendor_id: updated.assigned_vendor_id ?? null
          },
          batch: true
        }
      });
      auditLogIds.push(auditLog.id);
      results[index] = { ...results[index], audit_log_id: auditLog.id };
    });

    return createBatchRescheduleResultDto({
      success: true,
      applied_count: payload.items.length,
      failed_count: 0,
      items: results,
      audit_log_ids: auditLogIds
    });
  }
};

const createBatchResultSuccess = (
  id: number,
  plannedDate: string,
  vendorId: number
): BatchRescheduleItemResult => ({
  id,
  success: true,
  planned_date: plannedDate,
  assigned_vendor_id: vendorId
});
