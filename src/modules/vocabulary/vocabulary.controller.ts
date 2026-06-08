import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import {
  CreateVocabularyInput,
  DeleteVocabularyParams,
  GetVocabularyDeckDetailParams,
  ListVocabularyQuery,
  PronounceVocabularyInput,
  ReviewVocabularyInput,
  ReviewVocabularyParams,
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
 * HTTP Handler - listVocabularyDecksController
 * Summary: Lấy danh sách vocabulary deck theo session context của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId -> gọi service -> trả response chuẩn.
 */
export const listVocabularyDecksController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = await vocabularyService.listVocabularyDecks(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getVocabularyDeckDetailController
 * Summary: Lấy words nằm trong một deck session cụ thể của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedParams -> gọi service -> trả response chuẩn.
 */
export const getVocabularyDeckDetailController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as GetVocabularyDeckDetailParams;
    const result = await vocabularyService.getVocabularyDeckDetail(userId, params);
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
 * HTTP Handler - pronounceVocabularyController
 * Summary: Sinh audio pronunciation cho text vocabulary và stream binary về client.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedBody -> gọi service -> set audio headers -> send binary.
 */
export const pronounceVocabularyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as PronounceVocabularyInput;
    const result = await vocabularyService.pronounceVocabulary(input);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('X-TTS-Provider', result.provider);
    res.setHeader('X-TTS-Model', result.modelId);
    res.status(200).send(result.audio);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - reviewVocabularyController
 * Summary: Submit kết quả review cho một dictionary word của user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + params + body đã validate -> gọi service -> trả response chuẩn.
 */
export const reviewVocabularyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as ReviewVocabularyParams;
    const input = (req as any).validatedBody as ReviewVocabularyInput;
    const result = await vocabularyService.reviewVocabulary(userId, params, input);
    ok(res, result);
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
