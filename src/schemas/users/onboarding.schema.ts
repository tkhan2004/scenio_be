import { z } from 'zod';

const learningGoalValues = ['WORK', 'TRAVEL', 'DAILY', 'ALL'] as const;
const studyFrequencyValues = ['LIGHT', 'REGULAR', 'INTENSIVE'] as const;
const selfAssessmentValues = ['VOCABULARY', 'GRAMMAR', 'NATURALNESS', 'CONFIDENCE'] as const;
const levelValues = ['A1', 'A2', 'B1', 'B2'] as const;

export const updateOnboardingSchema = z.object({
  body: z.object({
    level: z.enum(levelValues).optional(),
    learningGoal: z.enum(learningGoalValues).optional(),
    studyFrequency: z.enum(studyFrequencyValues).optional(),
    selfAssessment: z.enum(selfAssessmentValues).optional(),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>['body'];
