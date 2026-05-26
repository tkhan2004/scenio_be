import { MissionType } from '@prisma/client';
import { z } from 'zod';

export const updateAdminMissionSchema = z.object({
  query: z.object({}),
  params: z.object({
    id: z.string().uuid('missionId không hợp lệ'),
  }),
  body: z.object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(300).optional(),
    missionType: z.nativeEnum(MissionType).optional(),
    targetValue: z.coerce.number().int().min(1).optional(),
    xpReward: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type UpdateAdminMissionParams = z.infer<typeof updateAdminMissionSchema>['params'];
export type UpdateAdminMissionInput = z.infer<typeof updateAdminMissionSchema>['body'];
