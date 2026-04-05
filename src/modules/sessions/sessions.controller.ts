import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import { LevelTestInput } from '../../schemas/sessions';
import * as sessionsService from './sessions.service';

/**
 * HTTP Handler - levelTestController
 * Summary: Xử lý một lượt hội thoại trong bài test trình độ.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả kết quả cho client.
 */
export const levelTestController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as LevelTestInput;
    const result = await sessionsService.runLevelTest(userId, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
