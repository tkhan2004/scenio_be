import { z } from 'zod';

export const listAdminMissionsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});
