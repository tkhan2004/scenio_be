import { z } from 'zod';

export const getProgressSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({}),
});
