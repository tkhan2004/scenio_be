import { VoiceGender } from '@prisma/client';
import { z } from 'zod';

export const listVoicesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    search: z.string().trim().min(1).max(120).optional(),
    gender: z.nativeEnum(VoiceGender).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

export type ListVoicesQuery = z.infer<typeof listVoicesSchema>['query'];
