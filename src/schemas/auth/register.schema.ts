import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').optional(),
    avatarUrl: z.string().url('Avatar URL không hợp lệ').optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
