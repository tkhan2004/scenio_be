import { MissionType } from '@prisma/client';
import { z } from 'zod';

export const createAdminMissionSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.object({
    title: z.string().trim().min(1, 'title là bắt buộc').max(120),
    description: z.string().trim().min(1, 'description là bắt buộc').max(300),
    missionType: z.nativeEnum(MissionType),
    targetValue: z.coerce.number().int().min(1),
    xpReward: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  }),
});

export type CreateAdminMissionInput = z.infer<typeof createAdminMissionSchema>['body'];
