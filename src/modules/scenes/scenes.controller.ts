import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import * as scenesService from './scenes.service';
import { ListScenesQuery, SearchScenesQuery } from '../../schemas/scenes';

export const listScenes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req as any).validatedQuery as ListScenesQuery;
    const result = await scenesService.listScenes(query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

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
