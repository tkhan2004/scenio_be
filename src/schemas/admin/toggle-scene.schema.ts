import { z } from 'zod';

export const toggleAdminSceneSchema = z.object({
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sceneId không hợp lệ'),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export type ToggleAdminSceneParams = z.infer<typeof toggleAdminSceneSchema>['params'];
export type ToggleAdminSceneInput = z.infer<typeof toggleAdminSceneSchema>['body'];
