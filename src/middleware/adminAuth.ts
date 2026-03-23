import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user || !user.isAdmin) {
    return fail(res, 'Chỉ admin mới có quyền truy cập', 'FORBIDDEN', 403);
  }
  
  next();
};
