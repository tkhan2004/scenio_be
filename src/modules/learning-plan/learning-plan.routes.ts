import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  completeLearningPlanStepSchema,
  generateLearningPlanSchema,
  getCurrentLearningPlanSchema,
  getLearningPlanCompletionSummarySchema,
  refreshLearningPlanSchema,
  startNextLearningPlanSchema,
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
 * @route   GET /api/learning-plan/:id/completion-summary
 * @desc    Lấy completion summary của một roadmap đã hoàn thành
 */
router.get(
  '/:id/completion-summary',
  auth,
  validate(getLearningPlanCompletionSummarySchema),
  learningPlanController.getLearningPlanCompletionSummary,
);

/**
 * @route   POST /api/learning-plan/:id/start-next
 * @desc    Tạo roadmap kế tiếp từ roadmap đã completed
 */
router.post(
  '/:id/start-next',
  auth,
  validate(startNextLearningPlanSchema),
  learningPlanController.startNextLearningPlan,
);

/**
 * @route   PATCH /api/learning-plan/steps/:id/complete
 * @desc    Đánh dấu một learning plan step đã hoàn thành
 */
router.patch('/steps/:id/complete', auth, validate(completeLearningPlanStepSchema), learningPlanController.completeLearningPlanStep);

export default router;
