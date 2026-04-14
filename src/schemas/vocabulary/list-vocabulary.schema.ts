import { z } from 'zod';

export const listVocabularySchema = z.object({
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    isMastered: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        return value === 'true';
      }),
  }),
  params: z.object({}),
});

export type ListVocabularyQuery = z.infer<typeof listVocabularySchema>['query'];
