import * as adminRepo from './admin.repository';
import { GetAllUsersQuery } from '../../schemas/admin';

type AdminUserRecord = Awaited<ReturnType<typeof adminRepo.findAdminUsers>>[number];

/**
 * Helper - mapAdminUser
 * Summary: Chuẩn hóa user record cho admin table, chỉ giữ field an toàn cho client.
 */
function mapAdminUser(user: AdminUserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    level: user.level,
    learningGoal: user.learningGoal,
    studyFrequency: user.studyFrequency,
    selfAssessment: user.selfAssessment,
    needsLevelTest: user.needsLevelTest,
    totalXp: user.totalXp,
    streakDays: user.streakDays,
    lastActiveDate: user.lastActiveDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    sessionsCount: user._count.sessions,
  };
}

/**
 * Function Objective - getAllUsers
 * Summary: Lấy danh sách toàn bộ learner cho admin dashboard.
 * Inputs: Query phân trang và search đã qua validation.
 * Behavior: Đếm tổng -> lấy users theo page hiện tại -> chuẩn hóa response cho bảng admin.
 * Returns: Summary, pagination metadata, và danh sách user đã loại field nhạy cảm.
 */
export async function getAllUsers(query: GetAllUsersQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const search = query.search?.trim() || undefined;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    adminRepo.countAdminUsers(search),
    adminRepo.findAdminUsers({ skip, take: limit, search }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    summary: {
      totalUsers: total,
      returnedUsers: users.length,
      search: search ?? null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    users: users.map(mapAdminUser),
  };
}
