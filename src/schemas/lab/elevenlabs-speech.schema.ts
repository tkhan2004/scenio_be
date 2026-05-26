import { z } from 'zod';

export const elevenlabsSpeechSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, 'text không được để trống').max(5000, 'text quá dài cho test lab'),
    voiceId: z.string().trim().min(1, 'voiceId không được để trống').optional(),
    modelId: z.string().trim().min(1, 'modelId không được để trống').optional(),
    outputFormat: z.string().trim().min(1, 'outputFormat không được để trống').optional(),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type ElevenLabsSpeechInput = z.infer<typeof elevenlabsSpeechSchema>['body'];
