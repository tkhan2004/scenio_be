import { z } from 'zod';

export const getAdminUserSessionsSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().uuid('userId không hợp lệ'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type GetAdminUserSessionsParams = z.infer<typeof getAdminUserSessionsSchema>['params'];
export type GetAdminUserSessionsQuery = z.infer<typeof getAdminUserSessionsSchema>['query'];
