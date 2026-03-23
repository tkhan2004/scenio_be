import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return fail(res, message, 'VALIDATION_ERROR', 400, details);
  }
  // Store validated data
  (req as any).validatedBody = result.data;
  next();
};
