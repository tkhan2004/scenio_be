import { z } from 'zod';

export const getVocabularyDeckDetailSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    sessionId: z.string().uuid('sessionId không hợp lệ'),
  }),
});

export type GetVocabularyDeckDetailParams = z.infer<typeof getVocabularyDeckDetailSchema>['params'];
