import { z } from 'zod';

export const listAdminBadgesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});
