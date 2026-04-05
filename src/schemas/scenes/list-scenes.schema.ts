import { Level, SceneCategory } from '@prisma/client';
import { z } from 'zod';

export const listScenesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    category: z.nativeEnum(SceneCategory).optional(),
    difficulty: z.nativeEnum(Level).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

export type ListScenesQuery = z.infer<typeof listScenesSchema>['query'];
