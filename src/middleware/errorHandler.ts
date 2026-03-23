import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Đã xảy ra lỗi không xác định';
  const details = err.details || null;

  // Xử lý các lỗi phổ biến ở đây (ví dụ: jwt, prisma, v.v.)
  if (err.name === 'JsonWebTokenError') {
    return fail(res, 'Token không hợp lệ', 'UNAUTHORIZED', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return fail(res, 'Token đã hết hạn', 'UNAUTHORIZED', 401);
  }

  // Fallback về format chuẩn
  fail(res, message, code, status, details);
};
