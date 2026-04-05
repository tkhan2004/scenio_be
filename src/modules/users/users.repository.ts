import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

/**
 * Repository - Users
 * Summary: Quản lý truy vấn dữ liệu cho user profile và onboarding.
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
