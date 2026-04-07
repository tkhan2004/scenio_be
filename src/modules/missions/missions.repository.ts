import prisma from '../../config/database';

const todayMissionSelect = {
  id: true,
  missionId: true,
  date: true,
  currentValue: true,
  isCompleted: true,
  completedAt: true,
  mission: {
    select: {
      id: true,
      title: true,
      description: true,
      missionType: true,
      targetValue: true,
      xpReward: true,
    },
  },
} as const;

/**
 * Repository - Missions
 * Summary: Quản lý truy vấn dữ liệu cho daily missions của user.
 */

/**
 * Query Objective - findUserMissionPreference
 * Summary: Lấy studyFrequency của user để quyết định số mission cần tạo trong ngày.
 * Query Shape: findUnique theo userId + select studyFrequency.
 */
export async function findUserMissionPreference(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      studyFrequency: true,
    },
  });
}

/**
 * Query Objective - findTodayUserMissions
 * Summary: Lấy danh sách mission hôm nay của user kèm metadata từ daily_missions.
 * Query Shape: findMany theo userId + date, include mission select.
 */
export async function findTodayUserMissions(userId: string, date: string) {
  return prisma.userMission.findMany({
    where: { userId, date },
    orderBy: [{ missionId: 'asc' }],
    select: todayMissionSelect,
  });
}

/**
 * Query Objective - findActiveDailyMissions
 * Summary: Lấy danh sách mission template đang active để tạo mission trong ngày.
 * Query Shape: findMany theo isActive + optional notIn ids.
 */
export async function findActiveDailyMissions(limit: number, excludeMissionIds: string[] = []) {
  return prisma.dailyMission.findMany({
    where: {
      isActive: true,
      id: excludeMissionIds.length > 0 ? { notIn: excludeMissionIds } : undefined,
    },
    take: limit,
    orderBy: [{ xpReward: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      missionType: true,
      targetValue: true,
      xpReward: true,
    },
  });
}

/**
 * Query Objective - createUserMissions
 * Summary: Tạo nhiều mission trong ngày cho user và bỏ qua các bản ghi đã tồn tại.
 * Query Shape: createMany + skipDuplicates theo unique(userId, missionId, date).
 */
export async function createUserMissions(data: Array<{ userId: string; missionId: string; date: string }>) {
  if (data.length === 0) return;

  await prisma.userMission.createMany({
    data,
    skipDuplicates: true,
  });
}
