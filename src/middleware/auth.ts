import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { fail } from '../utils/response';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return fail(res, 'Thiếu token xác thực', 'UNAUTHORIZED', 401);
  }

  try {
    (req as any).user = verifyAccessToken(token);
    next();
  } catch (err) {
    return fail(res, 'Token không hợp lệ hoặc đã hết hạn', 'UNAUTHORIZED', 401);
  }
};
