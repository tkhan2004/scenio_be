import { z } from 'zod';

export const createVocabularySchema = z.object({
  body: z
    .object({
      sceneVocabularyId: z.string().uuid('sceneVocabularyId không hợp lệ').optional(),
      word: z.string().trim().min(1, 'Từ vựng không được để trống').optional(),
      definition: z.string().trim().min(1, 'Định nghĩa không được để trống').optional(),
      sourceSessionId: z.string().uuid('sourceSessionId không hợp lệ').nullable().optional(),
    })
    .superRefine((data, ctx) => {
      const hasSceneVocabulary = Boolean(data.sceneVocabularyId);
      const hasManualVocabulary = Boolean(data.word && data.definition);

      if (!hasSceneVocabulary && !hasManualVocabulary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cần gửi sceneVocabularyId hoặc cặp word/definition',
          path: ['sceneVocabularyId'],
        });
      }

      if (hasSceneVocabulary && (data.word !== undefined || data.definition !== undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Không gửi word/definition khi đã có sceneVocabularyId',
          path: ['word'],
        });
      }
    }),
  query: z.object({}),
  params: z.object({}),
});

export type CreateVocabularyInput = z.infer<typeof createVocabularySchema>['body'];
