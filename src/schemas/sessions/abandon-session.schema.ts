import { z } from 'zod';

export const abandonSessionSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('Session id không hợp lệ'),
  }),
});

export type AbandonSessionParams = z.infer<typeof abandonSessionSchema>['params'];
