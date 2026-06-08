import { z } from 'zod';

export const pronounceVocabularySchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, 'text không được để trống').max(120, 'text quá dài cho pronunciation'),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type PronounceVocabularyInput = z.infer<typeof pronounceVocabularySchema>['body'];
