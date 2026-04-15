import prisma from '../../config/database';

function buildLearnerSearchWhere(search?: string) {
  if (!search) {
    return {
      isAdmin: false,
    };
  }

  return {
    isAdmin: false,
    OR: [
      {
        email: {
          contains: search,
          mode: 'insensitive' as const,
        },
      },
      {
        displayName: {
          contains: search,
          mode: 'insensitive' as const,
        },
      },
    ],
  };
}

/**
 * Repository - Admin
 * Summary: Quản lý truy cập dữ liệu cho các màn hình quản trị learner.
 */

/**
 * Query Objective - countAdminUsers
 * Summary: Đếm tổng số learner phục vụ phân trang bảng admin.
 * Query Shape: count user theo isAdmin = false, có search nếu được truyền vào.
 */
export async function countAdminUsers(search?: string) {
  return prisma.user.count({
    where: buildLearnerSearchWhere(search),
  });
}

/**
 * Query Objective - findAdminUsers
 * Summary: Lấy danh sách learner cho admin table theo page hiện tại.
 * Query Shape: findMany user theo isAdmin = false, orderBy createdAt desc, include session count.
 */
export async function findAdminUsers({
  skip,
  take,
  search,
}: {
  skip: number;
  take: number;
  search?: string;
}) {
  return prisma.user.findMany({
    where: buildLearnerSearchWhere(search),
    orderBy: [{ createdAt: 'desc' }, { email: 'asc' }],
    skip,
    take,
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      learningGoal: true,
      studyFrequency: true,
      selfAssessment: true,
      needsLevelTest: true,
      totalXp: true,
      streakDays: true,
      lastActiveDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });
}
