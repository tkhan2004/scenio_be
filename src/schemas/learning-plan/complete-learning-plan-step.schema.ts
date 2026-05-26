import { z } from 'zod';

export const completeLearningPlanStepSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().uuid('learning plan step id không hợp lệ'),
  }),
  query: z.object({}),
});

export type CompleteLearningPlanStepParams = z.infer<typeof completeLearningPlanStepSchema>['params'];

