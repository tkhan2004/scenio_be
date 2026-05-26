import { z } from 'zod';

export const getSceneVoicesSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sceneId không hợp lệ'),
  }),
});

export type GetSceneVoicesParams = z.infer<typeof getSceneVoicesSchema>['params'];
