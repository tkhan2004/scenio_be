import { z } from 'zod';

export const getTodayMissionsSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({}),
});
