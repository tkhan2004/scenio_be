import { AiFeatureType } from '@prisma/client';
import { z } from 'zod';

export const listAiModelsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    featureType: z.nativeEnum(AiFeatureType).optional(),
  }),
});

export type ListAiModelsQuery = z.infer<typeof listAiModelsSchema>['query'];
