import { z } from 'zod';

export const getSessionResultSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('Session id không hợp lệ'),
  }),
});

export type GetSessionResultParams = z.infer<typeof getSessionResultSchema>['params'];
