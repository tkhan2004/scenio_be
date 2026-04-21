import { z } from 'zod';

export const toggleAdminMissionSchema = z.object({
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('missionId không hợp lệ'),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export type ToggleAdminMissionParams = z.infer<typeof toggleAdminMissionSchema>['params'];
export type ToggleAdminMissionInput = z.infer<typeof toggleAdminMissionSchema>['body'];
