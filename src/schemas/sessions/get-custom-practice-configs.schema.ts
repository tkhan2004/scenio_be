import { z } from 'zod';

export const getCustomPracticeConfigsSchema = z.object({
  body: z.object({}),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(10),
  }),
  params: z.object({}),
});

export type GetCustomPracticeConfigsQuery = z.infer<
  typeof getCustomPracticeConfigsSchema
>['query'];
