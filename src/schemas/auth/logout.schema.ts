import { z } from 'zod';

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().trim().min(1, 'Refresh Token không được để trống'),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type LogoutInput = z.infer<typeof logoutSchema>['body'];
