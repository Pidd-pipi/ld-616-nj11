import { Router } from "express";
import { calibrationPlanController } from "../controllers/CalibrationPlanController";

const router = Router();

// 静态路径需声明在 "/:id/reschedule" 之前，避免被参数路由吞掉
router.get("/", calibrationPlanController.list);
router.post("/", calibrationPlanController.create);
router.get("/schedule-board", calibrationPlanController.scheduleBoard);
router.post("/batch-reschedule", calibrationPlanController.batchReschedule);
router.post("/:id/reschedule", calibrationPlanController.reschedule);

export default router;
