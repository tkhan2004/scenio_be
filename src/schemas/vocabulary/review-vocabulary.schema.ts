import { z } from 'zod';

export const reviewVocabularySchema = z.object({
  body: z.object({
    isDone: z.boolean().default(true),
    recallQuality: z.coerce.number().int().min(0).max(5).default(5),
  }),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('vocabularyId không hợp lệ'),
  }),
});

export type ReviewVocabularyInput = z.infer<typeof reviewVocabularySchema>['body'];
export type ReviewVocabularyParams = z.infer<typeof reviewVocabularySchema>['params'];
