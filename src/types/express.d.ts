import 'express';
import { AuthJwtPayload } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthJwtPayload;
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

export {};
