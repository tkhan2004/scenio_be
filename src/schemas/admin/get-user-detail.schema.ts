import { z } from 'zod';

export const getAdminUserDetailSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('userId không hợp lệ'),
  }),
});

export type GetAdminUserDetailParams = z.infer<typeof getAdminUserDetailSchema>['params'];
