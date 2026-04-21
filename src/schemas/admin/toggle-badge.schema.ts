import { z } from 'zod';

export const toggleAdminBadgeSchema = z.object({
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('badgeId không hợp lệ'),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export type ToggleAdminBadgeParams = z.infer<typeof toggleAdminBadgeSchema>['params'];
export type ToggleAdminBadgeInput = z.infer<typeof toggleAdminBadgeSchema>['body'];
