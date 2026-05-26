import { z } from 'zod';

export const toggleAdminVoiceSchema = z.object({
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('voiceId không hợp lệ'),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export type ToggleAdminVoiceParams = z.infer<typeof toggleAdminVoiceSchema>['params'];
export type ToggleAdminVoiceInput = z.infer<typeof toggleAdminVoiceSchema>['body'];
