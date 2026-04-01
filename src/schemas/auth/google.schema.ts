import { z } from 'zod';

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token không được để trống'),
  }),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>['body'];
