import { z } from 'zod';

export const updateMeSchema = z.object({
  body: z.object({
    displayName: z.string().trim().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').optional(),
    avatarUrl: z.string().url('Avatar URL không hợp lệ').nullable().optional(),
  }).refine(
    (data) => data.displayName !== undefined || data.avatarUrl !== undefined,
    {
      message: 'Cần gửi ít nhất một trường để cập nhật',
      path: ['displayName'],
    },
  ),
  query: z.object({}),
  params: z.object({}),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>['body'];
