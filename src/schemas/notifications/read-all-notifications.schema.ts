import { z } from 'zod';

export const readAllNotificationsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});
