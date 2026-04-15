import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import { GetAllUsersQuery } from '../../schemas/admin';
import * as adminService from './admin.service';

/**
 * HTTP Handler - getAllUsers
 * Summary: Trả về danh sách learner cho admin dashboard.
 * Inputs: req, res, next.
 * Behavior: Kiểm tra quyền admin -> lấy validatedQuery -> gọi service -> trả response chuẩn.
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = Boolean((req as any).user?.isAdmin);
    if (!isAdmin) {
      return fail(res, 'Bạn không có quyền truy cập tài nguyên này', 'FORBIDDEN', 403);
    }

    const query = (req as any).validatedQuery as GetAllUsersQuery;
    const result = await adminService.getAllUsers(query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
