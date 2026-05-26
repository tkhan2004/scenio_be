import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  abandonSessionSchema,
  completeSessionSchema,
  createRealtimeTokenSchema,
  getSessionResultSchema,
  levelTestSchema,
  sendSessionMessageSchema,
  sessionHintSchema,
  startCustomSessionSchema,
  startSessionSchema,
} from '../../schemas/sessions';
import {
  abandonSessionController,
  completeSessionController,
  createRealtimeTokenController,
  getSessionResultController,
  levelTestController,
  sendSessionMessageController,
  sessionHintController,
  startCustomSessionController,
  startSessionController,
} from './sessions.controller';

const router = Router();

/**
 * @route   POST /api/sessions/start
 * @desc    Tạo session học mới và trả opening message ban đầu
 */
router.post('/start', auth, validate(startSessionSchema), startSessionController);

/**
 * @route   POST /api/sessions/start-custom
 * @desc    Tạo custom practice session từ structured brief của user
 */
router.post('/start-custom', auth, validate(startCustomSessionSchema), startCustomSessionController);

/**
 * @route   POST /api/sessions/:id/realtime-token
 * @desc    Mint Realtime client secret cho session voice hiện tại
 */
router.post('/:id/realtime-token', auth, validate(createRealtimeTokenSchema), createRealtimeTokenController);

/**
 * @route   POST /api/sessions/level-test
 * @desc    Gửi một lượt level test và nhận phản hồi AI
 */
router.post('/level-test', auth, validate(levelTestSchema), levelTestController);

/**
 * @route   POST /api/sessions/:id/message
 * @desc    Đồng bộ finalized transcript/text turn về backend session
 */
router.post('/:id/message', auth, validate(sendSessionMessageSchema), sendSessionMessageController);

/**
 * @route   POST /api/sessions/:id/complete
 * @desc    Kích hoạt flow hoàn tất session và chấm điểm transcript từ backend
 */
router.post('/:id/complete', auth, validate(completeSessionSchema), completeSessionController);

/**
 * @route   POST /api/sessions/:id/hint
 * @desc    Sinh một hint ngắn cho session ACTIVE hiện tại
 */
router.post('/:id/hint', auth, validate(sessionHintSchema), sessionHintController);

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
