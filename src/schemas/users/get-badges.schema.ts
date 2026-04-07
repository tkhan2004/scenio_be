import { z } from 'zod';

export const getBadgesSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({}),
});
