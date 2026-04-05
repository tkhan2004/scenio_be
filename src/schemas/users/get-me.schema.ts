import { z } from 'zod';

export const getMeSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({}),
});

export type GetMeInput = z.infer<typeof getMeSchema>;
