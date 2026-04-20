import { SceneCategory } from "@prisma/client";
import * as homeRepo from "./home.repository";
import * as missionsService from "../missions/missions.service";

/**
 * Helper - mapGoalToCategories
 * Summary: Map learningGoal sang thứ tự category ưu tiên cho home.
 * Notes: Trả về null nếu user chọn ALL hoặc chưa có learningGoal.
 */
function mapGoalToCategories(goal: string | null): SceneCategory[] | null {
  switch (goal) {
    case "WORK":
      return [SceneCategory.WORK, SceneCategory.SOCIAL];
    case "TRAVEL":
      return [SceneCategory.TRAVEL, SceneCategory.DAILY];
    case "DAILY":
      return [SceneCategory.DAILY, SceneCategory.SOCIAL];
    case "ALL":
    case null:
      return null;
    default:
      return null;
  }
}

/**
 * Helper - sortScenesByCategoryPriority
 * Summary: Ưu tiên các scene theo thứ tự category mong muốn.
 * Notes: Dùng để giữ category chính đứng trước category fallback.
 */
function sortScenesByCategoryPriority<T extends { category: SceneCategory }>(scenes: T[], categories: SceneCategory[]) {
  const rank = new Map(categories.map((category, index) => [category, index]));
  return [...scenes].sort((a, b) => {
    const categoryDiff = (rank.get(a.category) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.category) ?? Number.MAX_SAFE_INTEGER);
    if (categoryDiff !== 0) return categoryDiff;
    return 0;
  });
}

/**
 * Function Objective - getRecommendedScenesForHome
 * Summary: Tạo danh sách scene gợi ý cho home theo level và learningGoal.
 * Inputs: userId, level hiện tại, learningGoal từ survey onboarding.
 * Behavior: Nếu user chưa có session thì ưu tiên learningGoal -> nếu thiếu thì fallback theo level.
 * Returns: Danh sách scene card phù hợp để hiển thị ở dashboard.
 */
async function getRecommendedScenesForHome(userId: string, level: Parameters<typeof homeRepo.findRecommendedScenesByLevel>[0], learningGoal: string | null) {
  const totalSessions = await homeRepo.countSessions(userId);

  if (totalSessions === 0) {
    const categories = mapGoalToCategories(learningGoal);
    if (categories) {
      const primary = sortScenesByCategoryPriority(
        await homeRepo.findRecommendedScenesByCategories(level, categories, 5),
        categories,
      );

      if (primary.length >= 5) {
        return primary.slice(0, 5);
      }

      const fallback = await homeRepo.findRecommendedScenesByLevel(
        level,
        5 - primary.length,
        primary.map((scene) => scene.id),
      );

      return [...primary, ...fallback];
    }
  }

  const byLevel = await homeRepo.findRecommendedScenesByLevel(level, 5);
  if (byLevel.length > 0) {
    return byLevel;
  }

  return homeRepo.findRecommendedScenesByCategories(level, Object.values(SceneCategory), 5);
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
    getRecommendedScenesForHome(userId, user.level, user.learningGoal),
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
          startedAt: inProgressSession.startedAt,
        }
      : null,
    recommendedScenes,
  };
}
