import prisma from "../../config/database";
import { Level } from "@prisma/client";

export async function findUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      totalXp: true,
      streakDays: true,
    },
  });
}

export async function findTodayMissions(userId: string, date: string) {
  return await prisma.userMission.findMany({
    where: { userId, date },
    include: {
      mission: {
        select: {
          title: true,
          targetValue: true,
          xpReward: true,
        },
      },
    },
  });
}

export async function findInProgressSession(userId: string) {
  return await prisma.session.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: {
      startedAt: "desc",
    },
    include: {
      scene: {
        select: {
          title: true,
          characterName: true,
        },
      },
    },
  });
}

export async function findRecommendedScenes(level: Level) {
  const byLevel = await prisma.scene.findMany({
    where: {
      isActive: true,
      difficulty: level,
    },
    take: 5,
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      estimatedMinutes: true,
      characterName: true,
    },
  });

  if (byLevel.length > 0) {
    return byLevel;
  }

  return await prisma.scene.findMany({
    where: { isActive: true },
    take: 5,
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      estimatedMinutes: true,
      characterName: true,
    },
  });
}
