import * as missionsRepo from './missions.repository';

const STUDY_FREQUENCY_MISSION_COUNT: Record<string, number> = {
  LIGHT: 2,
  REGULAR: 3,
  INTENSIVE: 4,
};

type TodayMissionRecord = Awaited<ReturnType<typeof missionsRepo.findTodayUserMissions>>[number];

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Helper - getTargetMissionCount
 * Summary: Quy đổi studyFrequency sang số daily mission nên hiển thị trong ngày.
 * Notes: Nếu chưa onboarding thì mặc định REGULAR = 3 mission.
 */
function getTargetMissionCount(studyFrequency: string | null | undefined) {
  return STUDY_FREQUENCY_MISSION_COUNT[studyFrequency ?? 'REGULAR'] ?? 3;
}

/**
 * Helper - mapTodayMission
 * Summary: Chuẩn hóa record user mission thành payload client-friendly.
 */
function mapTodayMission(item: TodayMissionRecord) {
  return {
    id: item.id,
    missionId: item.mission.id,
    title: item.mission.title,
    description: item.mission.description,
    missionType: item.mission.missionType,
    target: item.mission.targetValue,
    current: item.currentValue,
    xp: item.mission.xpReward,
    isCompleted: item.isCompleted,
    completedAt: item.completedAt,
    date: item.date,
  };
}

/**
 * Helper - ensureTodayMissions
 * Summary: Tạo đủ mission hôm nay cho user nếu hiện tại còn thiếu.
 * Notes: Dùng cho cả endpoint /missions/today và dashboard home để giữ dữ liệu nhất quán.
 */
export async function ensureTodayMissions(userId: string, date: string) {
  const user = await missionsRepo.findUserMissionPreference(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const targetCount = getTargetMissionCount(user.studyFrequency);
  let missions = await missionsRepo.findTodayUserMissions(userId, date);

  if (missions.length < targetCount) {
    const missingCount = targetCount - missions.length;
    const extraMissionTemplates = await missionsRepo.findActiveDailyMissions(
      missingCount,
      missions.map((item) => item.missionId),
    );

    await missionsRepo.createUserMissions(
      extraMissionTemplates.map((mission) => ({
        userId,
        missionId: mission.id,
        date,
      })),
    );

    missions = await missionsRepo.findTodayUserMissions(userId, date);
  }

  return missions;
}

/**
 * Function Objective - getTodayMissions
 * Summary: Lấy daily missions của user trong ngày hiện tại.
 * Inputs: userId từ access token đã verify.
 * Behavior: Tính ngày hiện tại -> đảm bảo mission đã được tạo đủ -> chuẩn hóa response.
 * Returns: Date hiện tại và danh sách mission card cho tab missions/dashboard.
 */
export async function getTodayMissions(userId: string) {
  const date = getTodayDateString();
  const missions = await ensureTodayMissions(userId, date);

  return {
    date,
    missions: missions.map(mapTodayMission),
  };
}
