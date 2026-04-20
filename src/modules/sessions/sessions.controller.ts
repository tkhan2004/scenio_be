import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import {
  AbandonSessionParams,
  CreateRealtimeTokenParams,
  GetSessionResultParams,
  LevelTestInput,
  SendSessionMessageInput,
  SendSessionMessageParams,
  StartCustomSessionInput,
  SessionHintInput,
  SessionHintParams,
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
 * HTTP Handler - startCustomSessionController
 * Summary: Tạo custom practice session từ structured brief của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả sessionId, openingMessage và custom practice summary.
 */
export const startCustomSessionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as StartCustomSessionInput;
    const result = await sessionsService.startCustomSession(userId, input);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - createRealtimeTokenController
 * Summary: Mint Realtime client secret cho session hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams -> gọi service -> trả response chuẩn.
 */
export const createRealtimeTokenController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as CreateRealtimeTokenParams;
    const result = await sessionsService.createRealtimeToken(userId, params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - sendSessionMessageController
 * Summary: Đồng bộ finalized transcript hoặc text turn về backend session.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams + validatedBody -> gọi service -> trả response chuẩn.
 */
export const sendSessionMessageController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as SendSessionMessageParams;
    const input = (req as any).validatedBody as SendSessionMessageInput;
    const result = await sessionsService.sendSessionMessage(userId, params, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - sessionHintController
 * Summary: Sinh một hint ngắn cho session ACTIVE hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams + validatedBody -> gọi service -> trả response chuẩn.
 */
export const sessionHintController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as SessionHintParams;
    const input = (req as any).validatedBody as SessionHintInput;
    const result = await sessionsService.createSessionHint(userId, params, input);
    ok(res, result);
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
