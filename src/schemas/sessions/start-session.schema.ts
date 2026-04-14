import { z } from 'zod';

export const startSessionSchema = z.object({
  body: z.object({
    sceneId: z.string().uuid('sceneId không hợp lệ'),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>['body'];
