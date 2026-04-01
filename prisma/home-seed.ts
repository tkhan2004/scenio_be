import bcrypt from "bcryptjs";
import {
  Level,
  MessageRole,
  MissionType,
  SceneCategory,
  SessionStatus,
} from "@prisma/client";
import { prisma } from "../src/config/database";

async function upsertScene(seed: {
  title: string;
  category: SceneCategory;
  description: string;
  missionText: string;
  difficulty: Level;
  characterName: string;
  characterRole: string;
  systemPrompt: string;
  estimatedMinutes?: number;
}) {
  const existing = await prisma.scene.findFirst({
    where: { title: seed.title },
    select: { id: true },
  });

  if (existing) {
    return prisma.scene.update({
      where: { id: existing.id },
      data: {
        category: seed.category,
        description: seed.description,
        missionText: seed.missionText,
        difficulty: seed.difficulty,
        characterName: seed.characterName,
        characterRole: seed.characterRole,
        systemPrompt: seed.systemPrompt,
        estimatedMinutes: seed.estimatedMinutes ?? 5,
        isActive: true,
      },
    });
  }

  return prisma.scene.create({
    data: {
      ...seed,
      estimatedMinutes: seed.estimatedMinutes ?? 5,
      isActive: true,
    },
  });
}

async function upsertDailyMission(seed: {
  title: string;
  description: string;
  missionType: MissionType;
  targetValue: number;
  xpReward: number;
}) {
  const existing = await prisma.dailyMission.findFirst({
    where: {
      title: seed.title,
      missionType: seed.missionType,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.dailyMission.update({
      where: { id: existing.id },
      data: {
        description: seed.description,
        targetValue: seed.targetValue,
        xpReward: seed.xpReward,
        isActive: true,
      },
    });
  }

  return prisma.dailyMission.create({
    data: {
      ...seed,
      isActive: true,
    },
  });
}

export async function runHomeSeed() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "learner@scenio.dev" },
    update: {
      password: passwordHash,
      displayName: "Scenio Learner",
      level: Level.A2,
      totalXp: 320,
      streakDays: 7,
    },
    create: {
      email: "learner@scenio.dev",
      password: passwordHash,
      displayName: "Scenio Learner",
      level: Level.A2,
      totalXp: 320,
      streakDays: 7,
      isAdmin: false,
    },
  });

  const [sceneCoffee, sceneAirport] = await Promise.all([
    upsertScene({
      title: "At the Coffee Shop",
      category: SceneCategory.DAILY,
      description: "Order a drink and ask follow-up questions politely.",
      missionText: "Order confidently and confirm details with the barista.",
      difficulty: Level.A2,
      characterName: "Mia",
      characterRole: "Barista",
      systemPrompt: "You are Mia, a friendly barista. Keep replies short and natural.",
      estimatedMinutes: 6,
    }),
    upsertScene({
      title: "Airport Check-in",
      category: SceneCategory.TRAVEL,
      description: "Check in luggage and ask about gate, boarding time, and seat.",
      missionText: "Complete check-in with clear travel questions.",
      difficulty: Level.A2,
      characterName: "David",
      characterRole: "Check-in Staff",
      systemPrompt: "You are David at airport check-in. Be clear, professional, and concise.",
      estimatedMinutes: 7,
    }),
  ]);

  const [mission1, mission2, mission3] = await Promise.all([
    upsertDailyMission({
      title: "Complete 1 scene today",
      description: "Finish one learning scene.",
      missionType: MissionType.COMPLETE_SCENE,
      targetValue: 1,
      xpReward: 50,
    }),
    upsertDailyMission({
      title: "Get score >= 80",
      description: "Reach at least 80 in one completed session.",
      missionType: MissionType.ACHIEVE_SCORE,
      targetValue: 80,
      xpReward: 70,
    }),
    upsertDailyMission({
      title: "Keep streak 3 days",
      description: "Maintain your learning streak for 3 days.",
      missionType: MissionType.MAINTAIN_STREAK,
      targetValue: 3,
      xpReward: 60,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  await Promise.all([
    prisma.userMission.upsert({
      where: {
        userId_missionId_date: { userId: user.id, missionId: mission1.id, date: today },
      },
      update: { currentValue: 0, isCompleted: false, completedAt: null },
      create: {
        userId: user.id,
        missionId: mission1.id,
        date: today,
        currentValue: 0,
        isCompleted: false,
      },
    }),
    prisma.userMission.upsert({
      where: {
        userId_missionId_date: { userId: user.id, missionId: mission2.id, date: today },
      },
      update: { currentValue: 0, isCompleted: false, completedAt: null },
      create: {
        userId: user.id,
        missionId: mission2.id,
        date: today,
        currentValue: 0,
        isCompleted: false,
      },
    }),
    prisma.userMission.upsert({
      where: {
        userId_missionId_date: { userId: user.id, missionId: mission3.id, date: today },
      },
      update: { currentValue: 2, isCompleted: false, completedAt: null },
      create: {
        userId: user.id,
        missionId: mission3.id,
        date: today,
        currentValue: 2,
        isCompleted: false,
      },
    }),
  ]);

  let activeSession = await prisma.session.findFirst({
    where: { userId: user.id, status: SessionStatus.ACTIVE },
    orderBy: { startedAt: "desc" },
  });

  if (!activeSession) {
    activeSession = await prisma.session.create({
      data: {
        userId: user.id,
        sceneId: sceneCoffee.id,
        status: SessionStatus.ACTIVE,
      },
    });
  }

  const activeMessagesCount = await prisma.message.count({
    where: { sessionId: activeSession.id },
  });

  if (activeMessagesCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          sessionId: activeSession.id,
          role: MessageRole.AI,
          content: "Hi! Welcome to the coffee shop. What would you like today?",
          turnIndex: 0,
        },
        {
          sessionId: activeSession.id,
          role: MessageRole.USER,
          content: "I'd like a medium latte, please.",
          turnIndex: 1,
          isGood: true,
          hasError: false,
        },
      ],
    });
  }

  const completed = await prisma.session.findFirst({
    where: { userId: user.id, status: SessionStatus.COMPLETED },
    select: { id: true },
  });

  if (!completed) {
    await prisma.session.create({
      data: {
        userId: user.id,
        sceneId: sceneAirport.id,
        status: SessionStatus.COMPLETED,
        grammarScore: 85,
        vocabularyScore: 78,
        naturalnessScore: 82,
        xpEarned: 60,
        endedAt: new Date(),
      },
    });
  }

  console.log("Home seed completed.");
  console.log("Sample login:", "learner@scenio.dev / 123456");
}
