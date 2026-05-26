import { z } from 'zod';

export const getLearningPlanCompletionSummarySchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('learning plan id không hợp lệ'),
  }),
});

export type GetLearningPlanCompletionSummaryParams =
  z.infer<typeof getLearningPlanCompletionSummarySchema>['params'];
