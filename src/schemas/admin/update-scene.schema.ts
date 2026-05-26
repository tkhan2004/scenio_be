import { Level, SceneCategory } from '@prisma/client';
import { z } from 'zod';

export const updateAdminSceneSchema = z.object({
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sceneId không hợp lệ'),
  }),
  body: z.object({
    title: z.string().trim().min(1).max(120).optional(),
    category: z.nativeEnum(SceneCategory).optional(),
    difficulty: z.nativeEnum(Level).optional(),
    description: z.string().trim().max(500).optional(),
    missionText: z.string().trim().max(300).optional(),
    estimatedMinutes: z.coerce.number().int().min(1).max(60).optional(),
    characterName: z.string().trim().max(80).optional(),
    characterRole: z.string().trim().max(120).optional(),
    systemPrompt: z.string().trim().max(4000).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type UpdateAdminSceneParams = z.infer<typeof updateAdminSceneSchema>['params'];
export type UpdateAdminSceneInput = z.infer<typeof updateAdminSceneSchema>['body'];
