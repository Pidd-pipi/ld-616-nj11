import type { NextFunction, Request, Response } from "express";
import { calibrationPlanService } from "../services/CalibrationPlanService";
import { validateBatchReschedulePayload, validateReschedulePayload } from "../validators/RescheduleValidator";

const actor = (req: Request) => (req as any).user;

export const calibrationPlanController = {
  list: (_req: Request, res: Response) => res.json(calibrationPlanService.list()),
  create: (req: Request, res: Response) => res.status(201).json(calibrationPlanService.create(req.body, actor(req))),
  scheduleBoard: (_req: Request, res: Response) => res.json(calibrationPlanService.scheduleBoard()),
  reschedule: (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = validateReschedulePayload(req.body);
      res.json(calibrationPlanService.reschedule(Number(req.params.id), payload, actor(req)));
    } catch (err) {
      next(err);
    }
  },
  batchReschedule: (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = validateBatchReschedulePayload(req.body);
      res.json(calibrationPlanService.batchReschedule(items, actor(req)));
    } catch (err) {
      next(err);
    }
  },
};
