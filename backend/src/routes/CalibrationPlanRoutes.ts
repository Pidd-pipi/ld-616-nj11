import { Router } from "express";
import { calibrationPlanController } from "../controllers/CalibrationPlanController";

const router = Router();

router.get("/", calibrationPlanController.list);
router.post("/", calibrationPlanController.create);
// 字面量路径必须注册在 /:id 之前
router.get("/schedule-board", calibrationPlanController.scheduleBoard);
router.post("/batch-reschedule", calibrationPlanController.batchReschedule);
router.post("/:id/reschedule", calibrationPlanController.reschedule);

export default router;
