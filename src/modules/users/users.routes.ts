import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getBadgesSchema,
  getMeSchema,
  getProgressSchema,
  updateMeSchema,
  updateOnboardingSchema,
} from '../../schemas/users';
import {
  getBadgesController,
  getMeController,
  getProgressController,
  updateMeController,
  updateOnboardingController,
} from './users.controller';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Lấy profile public của user hiện tại
 */
router.get('/me', auth, validate(getMeSchema), getMeController);

/**
 * @route   PATCH /api/users/me/onboarding
 * @desc    Lưu hoặc skip onboarding survey cho user hiện tại
 */
router.patch('/me/onboarding', auth, validate(updateOnboardingSchema), updateOnboardingController);

/**
 * @route   GET /api/users/progress
 * @desc    Lấy dữ liệu tiến độ học tập của user hiện tại
 */
router.get('/progress', auth, validate(getProgressSchema), getProgressController);

/**
 * @route   GET /api/users/badges
 * @desc    Lấy danh sách badges/achievements của user hiện tại
 */
router.get('/badges', auth, validate(getBadgesSchema), getBadgesController);

/**
 * @route   PATCH /api/users/me
 * @desc    Cập nhật displayName hoặc avatarUrl của user hiện tại
 */
router.patch('/me', auth, validate(updateMeSchema), updateMeController);

export default router;
