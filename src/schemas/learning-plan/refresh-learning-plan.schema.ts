import { z } from 'zod';

export const refreshLearningPlanSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

