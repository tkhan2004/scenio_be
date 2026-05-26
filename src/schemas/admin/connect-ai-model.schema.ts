import { z } from 'zod';

export const connectAiModelSchema = z.object({
  body: z.object({
    outputDimension: z.number().int().min(1).max(3072).nullable().optional(),
    fallbackModelIds: z.array(z.string().uuid('fallbackModelId không hợp lệ')).max(5).default([]),
    benchmarkText: z.string().trim().min(3).max(500).optional(),
    config: z.record(z.unknown()).optional(),
  }),
  params: z.object({
    id: z.string().uuid('id model không hợp lệ'),
  }),
  query: z.object({}),
});

export type ConnectAiModelInput = z.infer<typeof connectAiModelSchema>['body'];
export type ConnectAiModelParams = z.infer<typeof connectAiModelSchema>['params'];
