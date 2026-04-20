import { z } from 'zod';

export const listVocabularyDecksSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({}),
});

export type ListVocabularyDecksQuery = z.infer<typeof listVocabularyDecksSchema>['query'];
