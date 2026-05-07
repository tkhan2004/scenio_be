import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  completeLearningPlanStepSchema,
  generateLearningPlanSchema,
  getCurrentLearningPlanSchema,
  refreshLearningPlanSchema,
} from '../../schemas/learning-plan';
import * as learningPlanController from './learning-plan.controller';

const router = Router();

/**
 * @route   GET /api/learning-plan/current
 * @desc    Lấy learning plan active, tự tạo nếu user chưa có plan
 */
router.get('/current', auth, validate(getCurrentLearningPlanSchema), learningPlanController.getCurrentLearningPlan);

/**
 * @route   POST /api/learning-plan/generate
 * @desc    Tạo learning plan mới từ onboarding, level, session history, và recommend scenes
 */
router.post('/generate', auth, validate(generateLearningPlanSchema), learningPlanController.generateLearningPlan);

/**
 * @route   POST /api/learning-plan/refresh
 * @desc    Archive plan cũ và tạo lại learning plan mới
 */
router.post('/refresh', auth, validate(refreshLearningPlanSchema), learningPlanController.refreshLearningPlan);

/**
 * @route   PATCH /api/learning-plan/steps/:id/complete
 * @desc    Đánh dấu một learning plan step đã hoàn thành
 */
router.patch('/steps/:id/complete', auth, validate(completeLearningPlanStepSchema), learningPlanController.completeLearningPlanStep);

export default router;
