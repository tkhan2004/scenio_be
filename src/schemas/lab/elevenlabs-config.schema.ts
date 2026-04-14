import { z } from 'zod';

export const elevenlabsConfigSchema = z.object({
  body: z.any().optional(),
  query: z.object({}),
  params: z.object({}),
});
