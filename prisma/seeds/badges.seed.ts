import { Badge, ConditionType } from '@prisma/client';
import { SeedEntityMap, prisma } from './helpers';

export async function seedBadges(): Promise<SeedEntityMap<Badge>> {
  const definitions = [
    {
      key: 'firstSession',
      title: 'First Scene Complete',
      description: 'Complete your first practice scene.',
      iconKey: 'first_scene',
      conditionType: ConditionType.FIRST_SESSION,
      conditionValue: 1,
      xpReward: 30,
    },
    {
      key: 'threeScenes',
      title: 'Scene Explorer',
      description: 'Complete at least 3 scenes.',
      iconKey: 'scene_explorer',
      conditionType: ConditionType.SCENES_COMPLETED,
      conditionValue: 3,
      xpReward: 50,
    },
    {
      key: 'streakThree',
      title: '3-Day Streak',
      description: 'Keep learning for 3 days in a row.',
      iconKey: 'streak_3',
      conditionType: ConditionType.STREAK_DAYS,
      conditionValue: 3,
      xpReward: 45,
    },
    {
      key: 'highScore',
      title: 'Score Hunter',
      description: 'Get a score of at least 80.',
      iconKey: 'high_score',
      conditionType: ConditionType.HIGH_SCORE,
      conditionValue: 80,
      xpReward: 60,
    },
    {
      key: 'vocabSaver',
      title: 'Word Collector',
      description: 'Save 5 words to your vocabulary list.',
      iconKey: 'vocab_collector',
      conditionType: ConditionType.VOCAB_SAVED,
      conditionValue: 5,
      xpReward: 40,
    },
  ] as const;

  const badges: SeedEntityMap<Badge> = {};

  for (const definition of definitions) {
    const existing = await prisma.badge.findFirst({
      where: {
        title: definition.title,
        conditionType: definition.conditionType,
      },
      select: { id: true },
    });

    const data = {
      title: definition.title,
      description: definition.description,
      iconKey: definition.iconKey,
      conditionType: definition.conditionType,
      conditionValue: definition.conditionValue,
      xpReward: definition.xpReward,
      isActive: true,
    };

    const badge = existing
      ? await prisma.badge.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.badge.create({ data });

    badges[definition.key] = badge;
  }

  return badges;
}
