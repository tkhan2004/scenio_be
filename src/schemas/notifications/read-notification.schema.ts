import { z } from 'zod';

export const readNotificationSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('Notification id không hợp lệ'),
  }),
});

export type ReadNotificationParams = z.infer<typeof readNotificationSchema>['params'];
