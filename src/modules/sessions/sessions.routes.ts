import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { levelTestSchema } from '../../schemas/sessions';
import { levelTestController } from './sessions.controller';

const router = Router();

/**
 * @route   POST /api/sessions/level-test
 * @desc    Gửi một lượt level test và nhận phản hồi AI
 */
router.post('/level-test', auth, validate(levelTestSchema), levelTestController);

export default router;
