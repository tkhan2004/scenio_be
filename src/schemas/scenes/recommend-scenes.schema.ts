import { z } from 'zod';

export const recommendScenesSchema = z.object({
  body: z.object({}),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
  params: z.object({}),
});

export type RecommendScenesQuery = z.infer<typeof recommendScenesSchema>['query'];
