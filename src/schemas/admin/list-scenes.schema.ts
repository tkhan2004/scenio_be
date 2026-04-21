import { Level, SceneCategory } from '@prisma/client';
import { z } from 'zod';

export const listAdminScenesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    category: z.nativeEnum(SceneCategory).optional(),
    difficulty: z.nativeEnum(Level).optional(),
    isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type ListAdminScenesQuery = z.infer<typeof listAdminScenesSchema>['query'];
