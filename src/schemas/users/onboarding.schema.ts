import { z } from 'zod';

const learningGoalValues = ['WORK', 'TRAVEL', 'DAILY', 'SOCIAL', 'EXAM', 'ALL'] as const;
const practiceContextValues = [
  'INTERVIEW',
  'MEETING',
  'PRESENTATION',
  'EMAIL_FOLLOW_UP',
  'AIRPORT',
  'HOTEL',
  'RESTAURANT',
  'SMALL_TALK',
  'SHOPPING',
  'PHONE_CALL',
  'MEDICAL',
  'CUSTOMER_SERVICE',
] as const;
const focusSkillValues = [
  'GRAMMAR',
  'VOCABULARY',
  'NATURALNESS',
  'CONFIDENCE',
  'LISTENING',
  'PRONUNCIATION',
] as const;
const studyFrequencyValues = ['LIGHT', 'REGULAR', 'INTENSIVE'] as const;
const levelValues = ['A1', 'A2', 'B1', 'B2'] as const;

export const updateOnboardingSchema = z.object({
  body: z.object({
    level: z.enum(levelValues).optional(),
    targetLevel: z.enum(levelValues).optional(),
    learningGoal: z.enum(learningGoalValues).optional(),
    learningGoals: z.array(z.enum(learningGoalValues)).max(4).optional(),
    practiceContexts: z.array(z.enum(practiceContextValues)).max(10).optional(),
    focusSkills: z.array(z.enum(focusSkillValues)).max(4).optional(),
    studyFrequency: z.enum(studyFrequencyValues).optional(),
    selfAssessment: z.enum(focusSkillValues).optional(),
    dailyPracticeMinutes: z.number().int().min(5).max(60).optional(),
    targetOutcome: z.string().trim().min(1).max(220).optional(),
    correctionPreference: z.enum(['AFTER_RESPONSE', 'END_ONLY', 'MINIMAL']).optional(),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>['body'];
