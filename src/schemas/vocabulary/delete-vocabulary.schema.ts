import { z } from 'zod';

export const deleteVocabularySchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('Vocabulary id không hợp lệ'),
  }),
});

export type DeleteVocabularyParams = z.infer<typeof deleteVocabularySchema>['params'];
