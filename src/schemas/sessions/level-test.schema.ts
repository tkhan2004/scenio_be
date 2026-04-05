import { z } from 'zod';

const historyMessageSchema = z.object({
  role: z.enum(['USER', 'AI']),
  content: z.string().trim().min(1, 'Nội dung lịch sử không được để trống'),
});

export const levelTestSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, 'Tin nhắn không được để trống').nullable().optional(),
    turnIndex: z.number().int().min(0).max(5),
    history: z.array(historyMessageSchema).max(10),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type LevelTestInput = z.infer<typeof levelTestSchema>['body'];
export type LevelTestHistoryItem = z.infer<typeof historyMessageSchema>;
