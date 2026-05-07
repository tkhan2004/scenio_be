import { z } from 'zod';

export const getCurrentLearningPlanSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

