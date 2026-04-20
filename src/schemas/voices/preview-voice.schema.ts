import { z } from 'zod';

export const previewVoiceSchema = z.object({
  body: z.object({
    voiceId: z.string().uuid('voiceId không hợp lệ'),
    text: z.string().trim().min(1, 'text không được để trống').max(1000, 'text quá dài cho voice preview').optional(),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type PreviewVoiceInput = z.infer<typeof previewVoiceSchema>['body'];
