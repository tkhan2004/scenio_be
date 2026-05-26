import { SessionModality } from '@prisma/client';
import { z } from 'zod';

export const startSessionSchema = z.object({
  body: z.object({
    sceneId: z.string().uuid('sceneId không hợp lệ'),
    voiceProfileId: z.string().uuid('voiceProfileId không hợp lệ').optional(),
    modality: z.nativeEnum(SessionModality).default(SessionModality.TEXT),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>['body'];
