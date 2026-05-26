import { z } from 'zod';

const chatProxyMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1, 'Nội dung message không được để trống'),
});

export const chatProxySchema = z.object({
  body: z.object({
    apiBaseUrl: z.string().trim().url('apiBaseUrl không hợp lệ'),
    apiKey: z.string().trim().min(1, 'apiKey không được để trống'),
    model: z.string().trim().min(1, 'model không được để trống'),
    systemPrompt: z.string().trim().optional(),
    messages: z.array(chatProxyMessageSchema).min(1, 'Cần ít nhất một message'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(64).max(2048).default(400),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type ChatProxyInput = z.infer<typeof chatProxySchema>['body'];
