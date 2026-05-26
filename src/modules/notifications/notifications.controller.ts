import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import {
  ListNotificationsQuery,
  ReadNotificationParams,
} from '../../schemas/notifications';
import * as notificationsService from './notifications.service';

export const listNotificationsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const query = (req as any).validatedQuery as ListNotificationsQuery;
    const result = await notificationsService.listNotifications(userId, query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsReadController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const params = (req as any).validatedParams as ReadNotificationParams;
    const result = await notificationsService.markNotificationAsRead(userId, params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsReadController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = await notificationsService.markAllNotificationsAsRead(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
