import { z } from 'zod';

export const getAdminSceneSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sceneId không hợp lệ'),
  }),
});

export type GetAdminSceneParams = z.infer<typeof getAdminSceneSchema>['params'];
