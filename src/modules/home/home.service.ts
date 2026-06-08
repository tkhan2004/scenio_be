import * as homeRepo from "./home.repository";
import * as missionsService from "../missions/missions.service";
import * as scenesService from "../scenes/scenes.service";

function getTargetTurnsFromConversationLength(conversationLength?: string | null) {
  switch (conversationLength) {
    case 'SHORT':
      return 3;
    case 'LONG':
      return 7;
    case 'MEDIUM':
    default:
      return 5;
  }
}

/**
 * Function Objective - getRecommendedScenesForHome
 * Summary: Tạo danh sách scene gợi ý cho home bằng cùng semantic recommendation flow của learner.
 * Inputs: userId hiện tại.
 * Behavior: Reuse recommendScenes để dashboard và màn recommend dùng cùng retrieval path.
 * Returns: Danh sách scene card phù hợp để hiển thị ở dashboard.
 */
async function getRecommendedScenesForHome(userId: string) {
  const recommendation = await scenesService.recommendScenes(userId, { limit: 5 });
  return recommendation.scenes;
}

/**
 * Function Objective - getHome
 * Summary: Lấy toàn bộ dữ liệu dashboard cho user hiện tại.
 * Inputs: userId từ access token đã verify.
 * Behavior: Tải user -> mission hôm nay -> session active -> scene gợi ý.
 * Returns: Object dashboard đã chuẩn hóa cho mobile client.
 */
export async function getHome(userId: string) {
  const user = await homeRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error("User không tồn tại"), { code: "NOT_FOUND", status: 404 });
  }

  const [{ missions: todayMissions }, inProgressSession, recommendedScenes] = await Promise.all([
    missionsService.getTodayMissions(userId),
    homeRepo.findInProgressSession(userId),
    getRecommendedScenesForHome(userId),
  ]);

  const inProgressTitle = inProgressSession
    ? inProgressSession.sourceType === 'CUSTOM_PRACTICE'
      ? inProgressSession.customPracticeConfig?.displayTitle ?? 'Custom Practice'
      : inProgressSession.scene?.title ?? 'Unknown Scene'
    : null;
  const inProgressCharacter = inProgressSession
    ? inProgressSession.sourceType === 'CUSTOM_PRACTICE'
      ? inProgressSession.customPracticeConfig?.aiDisplayName ?? 'AI'
      : inProgressSession.scene?.characterName ?? 'AI'
    : null;
  const inProgressTargetTurns = inProgressSession
    ? inProgressSession.sourceType === 'CUSTOM_PRACTICE'
      ? getTargetTurnsFromConversationLength(
          inProgressSession.customPracticeConfig?.conversationLength,
        )
      : 3
    : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      level: user.level,
      totalXp: user.totalXp,
      streakDays: user.streakDays,
    },
    missions: todayMissions,
    inProgressSession: inProgressSession
      ? {
          id: inProgressSession.id,
          sourceType: inProgressSession.sourceType,
          sceneTitle: inProgressTitle,
          characterName: inProgressCharacter,
          targetTurns: inProgressTargetTurns,
          startedAt: inProgressSession.startedAt,
        }
      : null,
    recommendedScenes,
  };
}
