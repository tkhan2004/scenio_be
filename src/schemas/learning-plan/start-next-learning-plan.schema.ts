import { z } from 'zod';

export const startNextLearningPlanSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('learning plan id không hợp lệ'),
  }),
});

export type StartNextLearningPlanParams =
  z.infer<typeof startNextLearningPlanSchema>['params'];
