import { z } from 'zod';

export const listAdminVoicesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});
