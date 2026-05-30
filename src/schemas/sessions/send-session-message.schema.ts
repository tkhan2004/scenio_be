import { z } from 'zod';

export const sendSessionMessageSchema = z.object({
  body: z.object({
    source: z.enum(['USER_TEXT', 'USER_AUDIO', 'AI_TEXT', 'AI_AUDIO']),
    content: z.string().trim().min(1, 'content không được để trống').max(5000, 'content quá dài'),
    turnIndex: z.coerce.number().int().min(0).optional(),
    isFinal: z.boolean().default(true),
    generateAiReply: z.boolean().default(false),
    providerEventId: z.string().trim().min(1).max(200).optional(),
    audioStartMs: z.coerce.number().int().min(0).optional(),
    audioEndMs: z.coerce.number().int().min(0).optional(),
    completeSession: z.object({
      grammarScore: z.number().min(0).max(100).optional(),
      vocabularyScore: z.number().min(0).max(100).optional(),
      naturalnessScore: z.number().min(0).max(100).optional(),
      xpEarned: z.coerce.number().int().min(0).max(500).optional(),
    }).optional(),
  }),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('sessionId không hợp lệ'),
  }),
});

export type SendSessionMessageInput = z.infer<typeof sendSessionMessageSchema>['body'];
export type SendSessionMessageParams = z.infer<typeof sendSessionMessageSchema>['params'];
