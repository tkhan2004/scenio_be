import { z } from 'zod';

export const benchmarkAiModelSchema = z.object({
  body: z.object({
    sampleText: z.string().trim().min(3).max(500).optional(),
    outputDimension: z.number().int().min(1).max(3072).nullable().optional(),
  }),
  params: z.object({
    id: z.string().uuid('id model không hợp lệ'),
  }),
  query: z.object({}),
});

export type BenchmarkAiModelInput = z.infer<typeof benchmarkAiModelSchema>['body'];
export type BenchmarkAiModelParams = z.infer<typeof benchmarkAiModelSchema>['params'];
