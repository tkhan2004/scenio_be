import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  abandonSessionSchema,
  getSessionResultSchema,
  levelTestSchema,
  startSessionSchema,
} from '../../schemas/sessions';
import {
  abandonSessionController,
  getSessionResultController,
  levelTestController,
  startSessionController,
} from './sessions.controller';

const router = Router();

/**
 * @route   POST /api/sessions/start
 * @desc    Tạo session học mới và trả opening message ban đầu
 */
router.post('/start', auth, validate(startSessionSchema), startSessionController);

/**
 * @route   POST /api/sessions/level-test
 * @desc    Gửi một lượt level test và nhận phản hồi AI
 */
router.post('/level-test', auth, validate(levelTestSchema), levelTestController);

/**
 * @route   GET /api/sessions/:id/result
 * @desc    Lấy transcript và điểm số của session đã kết thúc
 */
router.get('/:id/result', auth, validate(getSessionResultSchema), getSessionResultController);

/**
 * @route   PATCH /api/sessions/:id/abandon
 * @desc    Thoát phiên học giữa chừng
 */
router.patch('/:id/abandon', auth, validate(abandonSessionSchema), abandonSessionController);

export default router;
