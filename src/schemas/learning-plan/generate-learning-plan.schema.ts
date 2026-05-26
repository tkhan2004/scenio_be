import { z } from 'zod';

export const generateLearningPlanSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});

