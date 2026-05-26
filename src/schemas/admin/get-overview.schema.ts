import { z } from 'zod';

export const getOverviewSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

export type GetOverviewQuery = z.infer<typeof getOverviewSchema>['query'];
