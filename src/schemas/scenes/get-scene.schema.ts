import { z } from 'zod';

export const getSceneSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('Scene ID không hợp lệ'),
  }),
});

export type GetSceneParams = z.infer<typeof getSceneSchema>['params'];
