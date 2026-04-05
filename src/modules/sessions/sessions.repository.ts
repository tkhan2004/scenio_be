import { Level } from '@prisma/client';
import prisma from '../../config/database';

/**
 * Repository - Sessions
 * Summary: Quản lý truy vấn dữ liệu cho session level test.
 */

/**
 * Query Objective - findUserById
 * Summary: Lấy thông tin user cần thiết để kiểm tra level test.
 * Query Shape: findUnique + select các field tối thiểu cho level test.
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      level: true,
      needsLevelTest: true,
    },
  });
}

/**
 * Query Objective - completeLevelTest
 * Summary: Cập nhật level và đánh dấu user đã hoàn thành level test.
 * Query Shape: update theo userId, set level + needsLevelTest + levelTestedAt.
 */
export async function completeLevelTest(userId: string, level: Level) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      level,
      needsLevelTest: false,
      levelTestedAt: new Date(),
    },
    select: {
      level: true,
      needsLevelTest: true,
      levelTestedAt: true,
    },
  });
}
