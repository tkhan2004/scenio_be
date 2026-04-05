import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getMeSchema, updateMeSchema, updateOnboardingSchema } from '../../schemas/users';
import { getMeController, updateMeController, updateOnboardingController } from './users.controller';

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
 * @route   PATCH /api/users/me
 * @desc    Cập nhật displayName hoặc avatarUrl của user hiện tại
 */
router.patch('/me', auth, validate(updateMeSchema), updateMeController);

export default router;
