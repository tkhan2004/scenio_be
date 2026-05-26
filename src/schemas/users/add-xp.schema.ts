import { z } from 'zod';

export const addXpSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid('sessionId không hợp lệ'),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type AddXpInput = z.infer<typeof addXpSchema>['body'];
