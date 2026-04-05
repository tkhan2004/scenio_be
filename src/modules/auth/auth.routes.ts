import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema, googleLoginSchema } from '../../schemas/auth';
import { auth } from '../../middleware/auth';

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
 * @route   POST /api/auth/google
 * @desc    Đăng nhập/đăng ký bằng Google ID Token
 */
router.post('/google', validate(googleLoginSchema), authController.googleLogin);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Kiểm tra access token còn hợp lệ và trả về user hiện tại
 */
router.get('/verify-token', auth, authController.verifyToken);

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
