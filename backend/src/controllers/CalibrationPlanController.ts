import type { NextFunction, Request, Response } from "express";
import { calibrationPlanService } from "../services/CalibrationPlanService";
import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/AppError";

const getActor = (req: Request): string => String((req as { user?: { id?: unknown } }).user?.id ?? "unknown");

// controller 层再次包装异常，与 service 层分离，错误码经 ERROR_CODES 统一出口
const sendError = (next: NextFunction, err: unknown) => {
  if (err instanceof AppError) {
    next(err);
    return;
  }
  next(new AppError(500, ERROR_CODES.INTERNAL_ERROR, (err as Error)?.message ?? "controller error"));
};

const toPlanId = (raw: string): number => Number(raw);

export const calibrationPlanController = {
  list: (_req: Request, res: Response) => res.json(calibrationPlanService.list()),

  create: (req: Request, res: Response) => res.status(201).json(calibrationPlanService.create(req.body)),

  // GET /api/calibration-plan/schedule-board 看板：设备、机构、计划、冲突
  scheduleBoard: (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(calibrationPlanService.getScheduleBoard());
    } catch (err) {
      sendError(next, err);
    }
  },

  // POST /api/calibration-plan/:id/reschedule 单条改期，冲突时原计划不变
  reschedule: (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = calibrationPlanService.reschedule(toPlanId(req.params.id), req.body, getActor(req));
      res.json(result);
    } catch (err) {
      sendError(next, err);
    }
  },

  // POST /api/calibration-plan/batch-reschedule 整批成功或全部保持原样
  batchReschedule: (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = calibrationPlanService.batchReschedule(req.body, getActor(req));
      res.json(result);
    } catch (err) {
      // 批量业务失败（409）同样以结构化错误返回，逐条原因挂在 details.result
      sendError(next, err);
    }
  }
};
