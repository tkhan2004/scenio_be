import { z } from 'zod';

export const completeSessionSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sessionId không hợp lệ'),
  }),
});

export type CompleteSessionParams = z.infer<typeof completeSessionSchema>['params'];
