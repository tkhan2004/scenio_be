import { z } from 'zod';

export const sessionHintSchema = z.object({
  body: z.object({
    focus: z.enum(['grammar', 'vocabulary', 'naturalness', 'pronunciation', 'conversation']).optional(),
  }),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sessionId không hợp lệ'),
  }),
});

export type SessionHintInput = z.infer<typeof sessionHintSchema>['body'];
export type SessionHintParams = z.infer<typeof sessionHintSchema>['params'];
