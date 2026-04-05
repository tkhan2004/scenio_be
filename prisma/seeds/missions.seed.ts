import { DailyMission, MissionType } from '@prisma/client';
import { SeedEntityMap, prisma } from './helpers';

export async function seedMissions(): Promise<SeedEntityMap<DailyMission>> {
  const definitions = [
    {
      key: 'completeScene',
      title: 'Complete 1 scene today',
      description: 'Finish one learning scene.',
      missionType: MissionType.COMPLETE_SCENE,
      targetValue: 1,
      xpReward: 50,
    },
    {
      key: 'achieveScore',
      title: 'Get score >= 80',
      description: 'Reach at least 80 in one completed session.',
      missionType: MissionType.ACHIEVE_SCORE,
      targetValue: 80,
      xpReward: 70,
    },
    {
      key: 'maintainStreak',
      title: 'Keep streak 3 days',
      description: 'Maintain your learning streak for 3 days.',
      missionType: MissionType.MAINTAIN_STREAK,
      targetValue: 3,
      xpReward: 60,
    },
    {
      key: 'saveVocabulary',
      title: 'Save 2 new words',
      description: 'Add at least two useful words to your vocabulary list.',
      missionType: MissionType.SAVE_VOCABULARY,
      targetValue: 2,
      xpReward: 40,
    },
  ] as const;

  const missions: SeedEntityMap<DailyMission> = {};

  for (const definition of definitions) {
    const existing = await prisma.dailyMission.findFirst({
      where: {
        title: definition.title,
        missionType: definition.missionType,
      },
      select: { id: true },
    });

    const data = {
      title: definition.title,
      description: definition.description,
      missionType: definition.missionType,
      targetValue: definition.targetValue,
      xpReward: definition.xpReward,
      isActive: true,
    };

    const mission = existing
      ? await prisma.dailyMission.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.dailyMission.create({ data });

    missions[definition.key] = mission;
  }

  return missions;
}
