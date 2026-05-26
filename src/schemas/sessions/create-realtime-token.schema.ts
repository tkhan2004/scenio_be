import { z } from 'zod';

export const createRealtimeTokenSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sessionId không hợp lệ'),
  }),
});

export type CreateRealtimeTokenParams = z.infer<typeof createRealtimeTokenSchema>['params'];
