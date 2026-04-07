import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getTodayMissionsSchema } from '../../schemas/missions';
import { getTodayMissionsController } from './missions.controller';

const router = Router();

/**
 * @route   GET /api/missions/today
 * @desc    Lấy daily missions của user trong ngày hiện tại
 */
router.get('/today', auth, validate(getTodayMissionsSchema), getTodayMissionsController);

export default router;
