import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

/**
 * Repository - Users
 * Summary: Quản lý truy vấn dữ liệu cho user profile, onboarding, progress và badges.
 */

/**
 * Query Objective - findUserById
 * Summary: Lấy user theo id để kiểm tra tồn tại trước khi update onboarding.
 * Query Shape: findUnique theo id.
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Query Objective - updateUserById
 * Summary: Cập nhật dữ liệu onboarding hoặc profile của user.
 * Query Shape: update theo id với Prisma.UserUpdateInput.
 */
export async function updateUserById(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

/**
 * Query Objective - findPublicUserProfileById
 * Summary: Lấy đầy đủ profile public của user hiện tại cho màn hình profile.
 * Query Shape: findUnique + select toàn bộ field client-safe, không gồm password.
 */
export async function findPublicUserProfileById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      googleId: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      learningGoal: true,
      studyFrequency: true,
      selfAssessment: true,
      needsLevelTest: true,
      levelTestedAt: true,
      onboardingCompletedAt: true,
      totalXp: true,
      streakDays: true,
      lastActiveDate: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Query Objective - findProgressUserById
 * Summary: Lấy snapshot tiến độ tổng quan của user cho progress screen.
 * Query Shape: findUnique + select level, totalXp, streakDays, lastActiveDate.
 */
export async function findProgressUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      level: true,
      totalXp: true,
      streakDays: true,
      lastActiveDate: true,
    },
  });
}

/**
 * Query Objective - findCompletedSessionsForProgress
 * Summary: Lấy toàn bộ completed sessions cần thiết để tính biểu đồ và history.
 * Query Shape: findMany theo userId + status COMPLETED, include scene summary.
 */
export async function findCompletedSessionsForProgress(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    orderBy: {
      endedAt: 'desc',
    },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      xpEarned: true,
      hintCount: true,
      grammarScore: true,
      vocabularyScore: true,
      naturalnessScore: true,
      scene: {
        select: {
          title: true,
          category: true,
          difficulty: true,
        },
      },
    },
  });
}

/**
 * Query Objective - findActiveBadgesWithEarnedStatus
 * Summary: Lấy tất cả badge active cùng trạng thái earned của user hiện tại.
 * Query Shape: findMany badge active + include userBadges filtered by userId.
 */
export async function findActiveBadgesWithEarnedStatus(userId: string) {
  return prisma.badge.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ xpReward: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      iconKey: true,
      conditionType: true,
      conditionValue: true,
      xpReward: true,
      userBadges: {
        where: { userId },
        select: {
          earnedAt: true,
        },
        take: 1,
      },
    },
  });
}
