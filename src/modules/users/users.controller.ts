import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import { UpdateMeInput, UpdateOnboardingInput } from '../../schemas/users';
import * as usersService from './users.service';

/**
 * HTTP Handler - getMeController
 * Summary: Lấy profile public của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId từ access token -> gọi service -> trả response chuẩn.
 */
export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = await usersService.getMe(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - updateOnboardingController
 * Summary: Lưu kết quả onboarding survey cho user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả response chuẩn.
 */
export const updateOnboardingController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as UpdateOnboardingInput;
    const result = await usersService.updateOnboarding(userId, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - updateMeController
 * Summary: Cập nhật profile cơ bản của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả response chuẩn.
 */
export const updateMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as UpdateMeInput;
    const result = await usersService.updateMe(userId, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getProgressController
 * Summary: Lấy dữ liệu tiến độ học tập cho user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId từ access token -> gọi service -> trả response chuẩn.
 */
export const getProgressController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = await usersService.getProgress(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getBadgesController
 * Summary: Lấy danh sách achievement/badges của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId từ access token -> gọi service -> trả response chuẩn.
 */
export const getBadgesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = await usersService.getBadges(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
