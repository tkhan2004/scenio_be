import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  listNotificationsSchema,
  readAllNotificationsSchema,
  readNotificationSchema,
} from '../../schemas/notifications';
import {
  listNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from './notifications.controller';

const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    Lấy danh sách in-app notifications của user hiện tại
 */
router.get('/', auth, validate(listNotificationsSchema), listNotificationsController);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Đánh dấu toàn bộ notifications là đã đọc
 */
router.patch('/read-all', auth, validate(readAllNotificationsSchema), markAllNotificationsAsReadController);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Đánh dấu một notification là đã đọc
 */
router.patch('/:id/read', auth, validate(readNotificationSchema), markNotificationAsReadController);

export default router;
