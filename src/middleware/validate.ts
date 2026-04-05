import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/response';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  if (!result.success) {
    const details = result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return fail(res, message, 'VALIDATION_ERROR', 400, details);
  }
  (req as any).validatedBody = (result.data as any).body ?? {};
  (req as any).validatedQuery = (result.data as any).query ?? {};
  (req as any).validatedParams = (result.data as any).params ?? {};
  next();
};
