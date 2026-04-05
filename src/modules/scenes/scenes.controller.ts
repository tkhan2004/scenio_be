import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import * as scenesService from './scenes.service';
import { GetSceneParams, ListScenesQuery, SearchScenesQuery } from '../../schemas/scenes';

/**
 * HTTP Handler - listScenes
 * Summary: Trả về danh sách scene có filter và phân trang.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedQuery -> gọi service -> trả response chuẩn.
 */
export const listScenes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req as any).validatedQuery as ListScenesQuery;
    const result = await scenesService.listScenes(query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - searchScenes
 * Summary: Tìm scene theo từ khóa cho user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedQuery -> gọi service -> trả response chuẩn.
 */
export const searchScenes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const query = (req as any).validatedQuery as SearchScenesQuery;
    const result = await scenesService.searchScenes(userId, query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getScene
 * Summary: Lấy chi tiết đầy đủ của một scene active.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedParams -> gọi service -> trả response chuẩn.
 */
export const getScene = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as GetSceneParams;
    const result = await scenesService.getSceneById(params.id);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
