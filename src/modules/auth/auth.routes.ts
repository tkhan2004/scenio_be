import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from '../../schemas/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký và lấy AccessToken + RefreshToken
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập lấy AccessToken + RefreshToken
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Lấy AccessToken mới từ RefreshToken
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Hủy RefreshToken để đăng xuất
 */
router.post('/logout', authController.logout);

export default router;