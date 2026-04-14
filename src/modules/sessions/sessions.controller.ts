import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import {
  AbandonSessionParams,
  GetSessionResultParams,
  LevelTestInput,
  StartSessionInput,
} from '../../schemas/sessions';
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

/**
 * HTTP Handler - startSessionController
 * Summary: Tạo session học mới cho user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả sessionId và openingMessage.
 */
export const startSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as StartSessionInput;
    const result = await sessionsService.startSession(userId, input);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getSessionResultController
 * Summary: Lấy transcript và điểm số của một session đã kết thúc.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams -> gọi service -> trả response chuẩn.
 */
export const getSessionResultController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as GetSessionResultParams;
    const result = await sessionsService.getSessionResult(userId, params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - abandonSessionController
 * Summary: Đánh dấu session ACTIVE là ABANDONED cho user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams -> gọi service -> trả response chuẩn.
 */
export const abandonSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as AbandonSessionParams;
    const result = await sessionsService.abandonSession(userId, params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
