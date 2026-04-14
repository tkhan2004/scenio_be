import {
  Badge,
  DailyMission,
  MessageRole,
  Scene,
  SceneVocabulary,
  Session,
  SessionStatus,
  User,
} from '@prisma/client';
import {
  SeedEntityMap,
  dateTime,
  resetSessionMessages,
  todayDateString,
  upsertSeedSession,
  prisma,
} from './helpers';

type ActivitySeedInput = {
  users: SeedEntityMap<User>;
  scenes: SeedEntityMap<Scene>;
  sceneVocabulary: SeedEntityMap<SceneVocabulary>;
  missions: SeedEntityMap<DailyMission>;
  badges: SeedEntityMap<Badge>;
};

type ActivitySeedResult = {
  sessions: SeedEntityMap<Session>;
};

export async function seedActivityData(input: ActivitySeedInput): Promise<ActivitySeedResult> {
  const { users, scenes, sceneVocabulary, missions, badges } = input;
  const today = todayDateString();

  async function upsertUserMission(args: {
    userId: string;
    missionId: string;
    date: string;
    currentValue: number;
    isCompleted: boolean;
    completedAt?: Date | null;
  }) {
    const existing = await prisma.userMission.findUnique({
      where: {
        userId_missionId_date: {
          userId: args.userId,
          missionId: args.missionId,
          date: args.date,
        },
      },
      select: { id: true },
    });

    const data = {
      userId: args.userId,
      missionId: args.missionId,
      date: args.date,
      currentValue: args.currentValue,
      isCompleted: args.isCompleted,
      completedAt: args.completedAt ?? null,
    };

    return existing
      ? prisma.userMission.update({
          where: { id: existing.id },
          data,
        })
      : prisma.userMission.create({ data });
  }

  async function upsertUserBadge(args: {
    userId: string;
    badgeId: string;
    earnedAt: Date;
  }) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: args.userId,
          badgeId: args.badgeId,
        },
      },
      select: { id: true },
    });

    const data = {
      userId: args.userId,
      badgeId: args.badgeId,
      earnedAt: args.earnedAt,
    };

    return existing
      ? prisma.userBadge.update({
          where: { id: existing.id },
          data,
        })
      : prisma.userBadge.create({ data });
  }

  async function upsertUserVocabulary(args: {
    userId: string;
    sceneVocabularyId: string;
    sourceSessionId?: string | null;
    isMastered: boolean;
    reviewedAt?: Date | null;
  }) {
    const existing = await prisma.userVocabulary.findUnique({
      where: {
        userId_sceneVocabularyId: {
          userId: args.userId,
          sceneVocabularyId: args.sceneVocabularyId,
        },
      },
      select: { id: true },
    });

    const data = {
      userId: args.userId,
      sceneVocabularyId: args.sceneVocabularyId,
      sourceSessionId: args.sourceSessionId ?? null,
      isMastered: args.isMastered,
      reviewedAt: args.reviewedAt ?? null,
    };

    return existing
      ? prisma.userVocabulary.update({
          where: { id: existing.id },
          data,
        })
      : prisma.userVocabulary.create({ data });
  }

  async function upsertManualUserVocabulary(args: {
    userId: string;
    word: string;
    definition: string;
    sourceSessionId?: string | null;
    isMastered: boolean;
    reviewedAt?: Date | null;
  }) {
    const existing = await prisma.userVocabulary.findFirst({
      where: {
        userId: args.userId,
        sceneVocabularyId: null,
        word: {
          equals: args.word,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    const data = {
      userId: args.userId,
      sceneVocabularyId: null,
      word: args.word,
      definition: args.definition,
      sourceSessionId: args.sourceSessionId ?? null,
      isMastered: args.isMastered,
      reviewedAt: args.reviewedAt ?? null,
    };

    return existing
      ? prisma.userVocabulary.update({
          where: { id: existing.id },
          data,
        })
      : prisma.userVocabulary.create({ data });
  }

  await Promise.all([
    upsertUserMission({
      userId: users.learner.id,
      missionId: missions.completeScene.id,
      date: today,
      currentValue: 0,
      isCompleted: false,
    }),
    upsertUserMission({
      userId: users.learner.id,
      missionId: missions.achieveScore.id,
      date: today,
      currentValue: 82,
      isCompleted: true,
      completedAt: dateTime('2026-04-02T10:30:00.000Z'),
    }),
    upsertUserMission({
      userId: users.learner.id,
      missionId: missions.maintainStreak.id,
      date: today,
      currentValue: 2,
      isCompleted: false,
    }),
    upsertUserMission({
      userId: users.learner.id,
      missionId: missions.saveVocabulary.id,
      date: today,
      currentValue: 2,
      isCompleted: true,
      completedAt: dateTime('2026-04-04T08:45:00.000Z'),
    }),
  ]);

  const learnerActive = await upsertSeedSession({
    userId: users.learner.id,
    sceneId: scenes.coffeeShop.id,
    startedAt: dateTime('2026-04-04T08:00:00.000Z'),
    status: SessionStatus.ACTIVE,
    hintCount: 1,
    xpEarned: 0,
  });

  await resetSessionMessages(learnerActive, [
    {
      role: MessageRole.AI,
      content: 'Hi! Welcome to the coffee shop. What would you like today?',
      turnIndex: 0,
      createdAt: dateTime('2026-04-04T08:00:10.000Z'),
    },
    {
      role: MessageRole.USER,
      content: "I'd like a medium latte, please.",
      turnIndex: 1,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-04T08:00:30.000Z'),
    },
    {
      role: MessageRole.AI,
      content: 'Sure. Would you like it hot or iced?',
      turnIndex: 2,
      createdAt: dateTime('2026-04-04T08:00:40.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'Hot, and can I also get the receipt?',
      turnIndex: 3,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-04T08:01:10.000Z'),
    },
  ]);

  const learnerCompleted = await upsertSeedSession({
    userId: users.learner.id,
    sceneId: scenes.airportCheckIn.id,
    startedAt: dateTime('2026-04-02T10:00:00.000Z'),
    status: SessionStatus.COMPLETED,
    grammarScore: 85,
    vocabularyScore: 78,
    naturalnessScore: 82,
    xpEarned: 60,
    xpGrantedAt: dateTime('2026-04-02T10:31:15.000Z'),
    hintCount: 0,
    endedAt: dateTime('2026-04-02T10:30:00.000Z'),
  });

  await resetSessionMessages(learnerCompleted, [
    {
      role: MessageRole.AI,
      content: 'Good morning. May I see your passport, please?',
      turnIndex: 0,
      createdAt: dateTime('2026-04-02T10:00:05.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'Sure, here it is. I have one bag to check in.',
      turnIndex: 1,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-02T10:00:25.000Z'),
    },
    {
      role: MessageRole.AI,
      content: 'Thank you. Do you have any liquids or batteries in your luggage?',
      turnIndex: 2,
      createdAt: dateTime('2026-04-02T10:00:40.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'No, and what time should I boarding?',
      turnIndex: 3,
      hasError: true,
      errorType: 'GRAMMAR',
      originalPhrase: 'what time should I boarding',
      suggestion: 'what time should I board',
      explanation: 'Sau should dùng động từ nguyên mẫu.',
      isGood: false,
      createdAt: dateTime('2026-04-02T10:01:15.000Z'),
    },
    {
      role: MessageRole.AI,
      content: 'Boarding starts at 8:20 p.m. Your gate is A12.',
      turnIndex: 4,
      createdAt: dateTime('2026-04-02T10:01:30.000Z'),
    },
  ]);

  const learnerAbandoned = await upsertSeedSession({
    userId: users.learner.id,
    sceneId: scenes.restaurantOrder.id,
    startedAt: dateTime('2026-04-03T18:00:00.000Z'),
    status: SessionStatus.ABANDONED,
    xpEarned: 0,
    hintCount: 1,
    endedAt: dateTime('2026-04-03T18:08:00.000Z'),
  });

  await resetSessionMessages(learnerAbandoned, [
    {
      role: MessageRole.AI,
      content: 'Hello, welcome in. Would you like to start with a drink or look at the menu first?',
      turnIndex: 0,
      createdAt: dateTime('2026-04-03T18:00:10.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'Could I see the menu first, please?',
      turnIndex: 1,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-03T18:00:28.000Z'),
    },
    {
      role: MessageRole.AI,
      content: 'Of course. I can also recommend a pasta if you like.',
      turnIndex: 2,
      createdAt: dateTime('2026-04-03T18:00:42.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'Thanks, I need a minute to decide.',
      turnIndex: 3,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-03T18:01:05.000Z'),
    },
  ]);

  const beginnerCompleted = await upsertSeedSession({
    userId: users.beginner.id,
    sceneId: scenes.hotelCheckIn.id,
    startedAt: dateTime('2026-04-03T09:00:00.000Z'),
    status: SessionStatus.COMPLETED,
    grammarScore: 72,
    vocabularyScore: 68,
    naturalnessScore: 70,
    xpEarned: 35,
    xpGrantedAt: dateTime('2026-04-03T09:21:15.000Z'),
    hintCount: 1,
    endedAt: dateTime('2026-04-03T09:20:00.000Z'),
  });

  await resetSessionMessages(beginnerCompleted, [
    {
      role: MessageRole.AI,
      content: 'Welcome to Sunrise Hotel. Do you have a reservation?',
      turnIndex: 0,
      createdAt: dateTime('2026-04-03T09:00:10.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'Yes, I have a reservation for two nights.',
      turnIndex: 1,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-03T09:00:25.000Z'),
    },
    {
      role: MessageRole.AI,
      content: 'Great. Breakfast is on the second floor from 6:30 to 10.',
      turnIndex: 2,
      createdAt: dateTime('2026-04-03T09:00:40.000Z'),
    },
  ]);

  const xpTesterPendingXp = await upsertSeedSession({
    userId: users.xpTester.id,
    sceneId: scenes.pharmacyVisit.id,
    startedAt: dateTime('2026-04-04T14:00:00.000Z'),
    status: SessionStatus.COMPLETED,
    grammarScore: 82,
    vocabularyScore: 86,
    naturalnessScore: 80,
    xpEarned: 50,
    hintCount: 0,
    endedAt: dateTime('2026-04-04T14:12:00.000Z'),
  });

  await resetSessionMessages(xpTesterPendingXp, [
    {
      role: MessageRole.AI,
      content: 'Hi, how can I help you today?',
      turnIndex: 0,
      createdAt: dateTime('2026-04-04T14:00:08.000Z'),
    },
    {
      role: MessageRole.USER,
      content: 'I have a sore throat and I would like something mild for it.',
      turnIndex: 1,
      hasError: false,
      isGood: true,
      createdAt: dateTime('2026-04-04T14:00:24.000Z'),
    },
    {
      role: MessageRole.AI,
      content: 'I can suggest lozenges. Please take one tablet after dinner if the pain gets worse.',
      turnIndex: 2,
      createdAt: dateTime('2026-04-04T14:00:49.000Z'),
    },
  ]);

  await Promise.all([
    upsertUserBadge({
      userId: users.learner.id,
      badgeId: badges.firstSession.id,
      earnedAt: dateTime('2026-04-02T10:31:00.000Z'),
    }),
    upsertUserBadge({
      userId: users.learner.id,
      badgeId: badges.highScore.id,
      earnedAt: dateTime('2026-04-02T10:31:10.000Z'),
    }),
    upsertUserBadge({
      userId: users.beginner.id,
      badgeId: badges.firstSession.id,
      earnedAt: dateTime('2026-04-03T09:21:00.000Z'),
    }),
  ]);

  await Promise.all([
    upsertUserVocabulary({
      userId: users.learner.id,
      sceneVocabularyId: sceneVocabulary['coffeeShop.latte'].id,
      sourceSessionId: learnerActive.id,
      isMastered: false,
    }),
    upsertUserVocabulary({
      userId: users.learner.id,
      sceneVocabularyId: sceneVocabulary['airportCheckIn.boardingPass'].id,
      sourceSessionId: learnerCompleted.id,
      isMastered: true,
      reviewedAt: dateTime('2026-04-04T09:00:00.000Z'),
    }),
    upsertUserVocabulary({
      userId: users.beginner.id,
      sceneVocabularyId: sceneVocabulary['hotelCheckIn.breakfast'].id,
      sourceSessionId: beginnerCompleted.id,
      isMastered: false,
    }),
    upsertManualUserVocabulary({
      userId: users.learner.id,
      word: 'queue number',
      definition: 'a number that shows your turn while waiting in line',
      sourceSessionId: learnerCompleted.id,
      isMastered: false,
    }),
  ]);

  return {
    sessions: {
      learnerActive,
      learnerCompleted,
      learnerAbandoned,
      beginnerCompleted,
      xpTesterPendingXp,
    },
  };
}
