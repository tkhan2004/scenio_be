import { z } from 'zod';

export const getVoiceSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('voiceId không hợp lệ'),
  }),
});

export type GetVoiceParams = z.infer<typeof getVoiceSchema>['params'];
