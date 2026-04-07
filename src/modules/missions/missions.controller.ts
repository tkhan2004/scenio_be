import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import * as missionsService from './missions.service';

/**
 * HTTP Handler - getTodayMissionsController
 * Summary: Lấy daily missions của user trong ngày hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId từ access token -> gọi service -> trả response chuẩn.
 */
export const getTodayMissionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = await missionsService.getTodayMissions(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
