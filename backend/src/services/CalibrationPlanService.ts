import { calibrationPlanRepository } from "../repositories/CalibrationPlanRepository";
import { calibrationVendorRepository } from "../repositories/CalibrationVendorRepository";
import { measuringDeviceRepository } from "../repositories/MeasuringDeviceRepository";
import { scheduleConflictService } from "./ScheduleConflictService";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { createScheduleBoardDto } from "../constructors/ScheduleBoardDtoFactory";
import { createBatchItemResultDto, createBatchRescheduleResultDto, createRescheduleResultDto } from "../constructors/RescheduleResultDtoFactory";
import { toAuditTarget } from "../utils/formatters";
import { httpError } from "../utils/httpError";
import type { BatchRescheduleItem } from "../types/BatchReschedulePayload";
import type { ReschedulePayload } from "../types/ReschedulePayload";
import type { CalibrationPlan } from "../models/CalibrationPlan";

// LOG_TEMPLATES.CalibrationPlan 顺序：create / update / status / export / reschedule / batchReschedule
const PLAN_CREATE_LOG = LOG_TEMPLATES.CalibrationPlan[0];
const PLAN_RESCHEDULE_LOG = LOG_TEMPLATES.CalibrationPlan[4];
const PLAN_BATCH_RESCHEDULE_LOG = LOG_TEMPLATES.CalibrationPlan[5];

type Actor = { id: number; role: string } | undefined;

const audit = (template: string, plan: CalibrationPlan, actor: Actor) =>
  console.info(template, toAuditTarget("CalibrationPlan", plan.id), {
    planned_date: plan.planned_date,
    assigned_vendor_id: plan.assigned_vendor_id,
    status: plan.status,
    actor: actor ?? "system",
  });

export const calibrationPlanService = {
  list: () => calibrationPlanRepository.findAll(),

  create: (row: unknown, actor?: Actor) => {
    const record = calibrationPlanRepository.save(row);
    console.info(PLAN_CREATE_LOG, toAuditTarget("CalibrationPlan", record.id), { actor: actor ?? "system" });
    return record;
  },

  // 排期看板：设备、机构、计划与当前冲突一览
  scheduleBoard: () => {
    const plans = calibrationPlanRepository.findAll();
    const conflicts = scheduleConflictService.findBoardConflicts(plans);
    return createScheduleBoardDto(measuringDeviceRepository.findAll(), calibrationVendorRepository.findAll(), plans, conflicts);
  },

  // 单条改期：有任何冲突则保持原计划不变并抛出 409
  reschedule: (id: number, payload: ReschedulePayload, actor?: Actor) => {
    const plan = calibrationPlanRepository.findById(id);
    if (!plan) throw httpError(404, ERROR_CODES.PLAN_NOT_FOUND, ERROR_MESSAGES.PLAN_NOT_FOUND);
    const vendorId = payload.assigned_vendor_id ?? plan.assigned_vendor_id;
    const reasons = scheduleConflictService.checkPlacement({
      planId: plan.id,
      deviceId: plan.device_id,
      vendorId,
      date: payload.planned_date,
      plans: calibrationPlanRepository.findAll(),
    });
    if (reasons.length > 0) {
      throw httpError(409, ERROR_CODES.RESCHEDULE_CONFLICT, ERROR_MESSAGES.RESCHEDULE_CONFLICT, { reasons, plan });
    }
    const updated = calibrationPlanRepository.update(plan.id, { planned_date: payload.planned_date, assigned_vendor_id: vendorId })!;
    audit(PLAN_RESCHEDULE_LOG, updated, actor);
    return createRescheduleResultDto(updated);
  },

  // 批量改期：先在“假设整批已应用”的快照上校验，任何一条失败则整批保持原样并逐条说明原因
  batchReschedule: (items: BatchRescheduleItem[], actor?: Actor) => {
    const results = items.map((item) => createBatchItemResultDto(item?.id, false, []));
    const proposals = new Map<number, { planned_date: string; vendor_id: number; plan: CalibrationPlan }>();
    const seen = new Set<number>();

    items.forEach((item, index) => {
      const fail = (code: string, message: string) => { results[index].reasons.push({ code, message }); };
      if (!item || !Number.isInteger(item.id)) return fail(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED);
      if (seen.has(item.id)) return fail(ERROR_CODES.DUPLICATE_PLAN_IN_BATCH, ERROR_MESSAGES.DUPLICATE_PLAN_IN_BATCH);
      seen.add(item.id);
      if (typeof item.planned_date !== "string" || Number.isNaN(Date.parse(item.planned_date))) return fail(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED);
      if (item.assigned_vendor_id !== undefined && !Number.isInteger(item.assigned_vendor_id)) return fail(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED);
      const plan = calibrationPlanRepository.findById(item.id);
      if (!plan) return fail(ERROR_CODES.PLAN_NOT_FOUND, ERROR_MESSAGES.PLAN_NOT_FOUND);
      proposals.set(item.id, { planned_date: item.planned_date, vendor_id: item.assigned_vendor_id ?? plan.assigned_vendor_id, plan });
    });

    const hypothetical = calibrationPlanRepository.findAll().map((plan) => {
      const proposal = proposals.get(plan.id);
      return proposal ? { ...plan, planned_date: proposal.planned_date, assigned_vendor_id: proposal.vendor_id } : plan;
    });

    proposals.forEach((proposal, id) => {
      const reasons = scheduleConflictService.checkPlacement({ planId: id, deviceId: proposal.plan.device_id, vendorId: proposal.vendor_id, date: proposal.planned_date, plans: hypothetical });
      if (reasons.length > 0) {
        const index = items.findIndex((item) => item?.id === id);
        results[index].reasons.push(...reasons);
      }
    });

    results.forEach((result) => { result.ok = result.reasons.length === 0; });

    if (results.some((result) => !result.ok)) {
      throw httpError(409, ERROR_CODES.BATCH_RESCHEDULE_FAILED, ERROR_MESSAGES.BATCH_RESCHEDULE_FAILED, createBatchRescheduleResultDto(false, results));
    }

    const updatedPlans = items.map((item) => {
      const proposal = proposals.get(item.id)!;
      const updated = calibrationPlanRepository.update(item.id, { planned_date: proposal.planned_date, assigned_vendor_id: proposal.vendor_id })!;
      audit(PLAN_BATCH_RESCHEDULE_LOG, updated, actor);
      return updated;
    });

    return createBatchRescheduleResultDto(true, results.map((result, index) => ({ ...result, plan: updatedPlans[index] })));
  },
};
