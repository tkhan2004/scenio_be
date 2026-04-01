import * as homeRepo from "./home.repository";

export async function getHome(userId: string) {
  const user = await homeRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error("User không tồn tại"), { code: "NOT_FOUND", status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [todayMissions, inProgressSession, recommendedScenes] = await Promise.all([
    homeRepo.findTodayMissions(userId, today),
    homeRepo.findInProgressSession(userId),
    homeRepo.findRecommendedScenes(user.level),
  ]);

  return {
    user,
    missions: todayMissions.map((item) => ({
      id: item.id,
      title: item.mission.title,
      target: item.mission.targetValue,
      current: item.currentValue,
      xp: item.mission.xpReward,
      isCompleted: item.isCompleted,
    })),
    inProgressSession: inProgressSession
      ? {
          id: inProgressSession.id,
          sceneTitle: inProgressSession.scene.title,
          characterName: inProgressSession.scene.characterName,
          startedAt: inProgressSession.startedAt,
        }
      : null,
    recommendedScenes,
  };
}
