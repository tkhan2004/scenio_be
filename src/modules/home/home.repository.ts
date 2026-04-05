import prisma from "../../config/database";
import { Level, Prisma, SceneCategory } from "@prisma/client";

const homeSceneSelect = {
  id: true,
  title: true,
  category: true,
  difficulty: true,
  estimatedMinutes: true,
  characterName: true,
} satisfies Prisma.SceneSelect;

/**
 * Repository - Home
 * Summary: Quản lý truy vấn dữ liệu phục vụ dashboard home.
 */

/**
 * Query Objective - findUserById
 * Summary: Lấy thông tin user cần thiết để render dashboard.
 * Query Shape: findUnique + select các field profile và onboarding liên quan.
 */
export async function findUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      learningGoal: true,
      needsLevelTest: true,
      totalXp: true,
      streakDays: true,
    },
  });
}

/**
 * Query Objective - countSessions
 * Summary: Đếm tổng số session của user để xác định user mới hay cũ.
 * Query Shape: count theo userId.
 */
export async function countSessions(userId: string) {
  return await prisma.session.count({
    where: { userId },
  });
}

/**
 * Query Objective - findTodayMissions
 * Summary: Lấy các daily mission của user trong ngày hiện tại.
 * Query Shape: findMany theo userId + date, include mission metadata.
 */
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

/**
 * Query Objective - findInProgressSession
 * Summary: Lấy session ACTIVE gần nhất để hiển thị nút continue.
 * Query Shape: findFirst + orderBy startedAt desc + include scene info.
 */
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

/**
 * Query Objective - findRecommendedScenesByLevel
 * Summary: Lấy scene active theo đúng level của user.
 * Query Shape: findMany theo level + optional excludeIds + select home card.
 */
export async function findRecommendedScenesByLevel(level: Level, take: number, excludeIds: string[] = []) {
  return await prisma.scene.findMany({
    where: {
      isActive: true,
      difficulty: level,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
    },
    take,
    orderBy: [{ title: "asc" }],
    select: homeSceneSelect,
  });
}

/**
 * Query Objective - findRecommendedScenesByCategories
 * Summary: Lấy scene active theo level và nhóm category ưu tiên.
 * Query Shape: findMany theo level + category in[] + select home card.
 */
export async function findRecommendedScenesByCategories(level: Level, categories: SceneCategory[], take: number) {
  return await prisma.scene.findMany({
    where: {
      isActive: true,
      difficulty: level,
      category: { in: categories },
    },
    take,
    orderBy: [{ title: "asc" }],
    select: homeSceneSelect,
  });
}
