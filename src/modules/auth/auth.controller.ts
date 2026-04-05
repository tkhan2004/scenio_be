import { Request, Response, NextFunction } from 'express';
import { ok, fail } from '../../utils/response';
import * as authService from './auth.service';
import { RegisterInput, LoginInput, GoogleLoginInput } from '../../schemas/auth';

/**
 * HTTP Handler - register
 * Summary: Đăng ký người dùng và trả về bộ đôi token.
 * Inputs: req, res, next.
 * Behavior: Get input -> Call service -> Send 201 response.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as RegisterInput;
    const result = await authService.register(input);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - login
 * Summary: Đăng nhập và trả về bộ đôi token mới.
 * Inputs: req, res, next.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as LoginInput;
    const result = await authService.login(input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - googleLogin
 * Summary: Đăng nhập/đăng ký bằng Google ID token.
 * Inputs: body.idToken.
 */
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as GoogleLoginInput;
    const result = await authService.loginWithGoogle(input.idToken);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - verifyToken
 * Summary: Kiểm tra access token còn hợp lệ và trả về user hiện tại.
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);

    const user = await authService.verifyTokenUser(userId);
    ok(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - refresh
 * Summary: Lấy Access Token mới từ Refresh Token.
 * Inputs: body.refreshToken.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, 'Thiếu Refresh Token', 'BAD_REQUEST', 400);

    const result = await authService.refresh(refreshToken);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - logout
 * Summary: Đăng xuất bằng cách hủy Refresh Token.
 * Inputs: body.refreshToken.
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    ok(res, { message: 'Đăng xuất thành công' });
  } catch (error) {
    next(error);
  }
};
