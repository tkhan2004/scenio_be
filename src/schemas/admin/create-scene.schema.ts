import { Level, SceneCategory } from '@prisma/client';
import { z } from 'zod';

export const createAdminSceneSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    title: z.string().trim().min(1, 'title là bắt buộc').max(120),
    category: z.nativeEnum(SceneCategory).default(SceneCategory.TRAVEL),
    difficulty: z.nativeEnum(Level).default(Level.A2),
    description: z.string().trim().max(500).default(''),
    missionText: z.string().trim().max(300).default(''),
    estimatedMinutes: z.coerce.number().int().min(1).max(60).default(5),
    characterName: z.string().trim().max(80).default(''),
    characterRole: z.string().trim().max(120).default(''),
    systemPrompt: z.string().trim().max(4000).default(''),
    isActive: z.boolean().default(true),
  }),
});

export type CreateAdminSceneInput = z.infer<typeof createAdminSceneSchema>['body'];
