import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import {
  CreateVocabularyInput,
  DeleteVocabularyParams,
  ListVocabularyQuery,
} from '../../schemas/vocabulary';
import * as vocabularyService from './vocabulary.service';

/**
 * HTTP Handler - listVocabularyController
 * Summary: Lấy danh sách từ vựng đã lưu của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedQuery -> gọi service -> trả response chuẩn.
 */
export const listVocabularyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const query = (req as any).validatedQuery as ListVocabularyQuery;
    const result = await vocabularyService.listVocabulary(userId, query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - createVocabularyController
 * Summary: Lưu một từ mới vào danh sách học của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả response chuẩn.
 */
export const createVocabularyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as CreateVocabularyInput;
    const result = await vocabularyService.createVocabulary(userId, input);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - deleteVocabularyController
 * Summary: Xóa một từ đã lưu khỏi danh sách học của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams -> gọi service -> trả response chuẩn.
 */
export const deleteVocabularyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as DeleteVocabularyParams;
    const result = await vocabularyService.deleteVocabulary(userId, params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
