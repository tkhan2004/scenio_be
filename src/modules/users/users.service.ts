import { UpdateMeInput, UpdateOnboardingInput } from '../../schemas/users';
import * as usersRepo from './users.repository';

function buildUserProfile(user: NonNullable<Awaited<ReturnType<typeof usersRepo.findPublicUserProfileById>>>) {
  return {
    ...user,
    needsOnboarding: user.onboardingCompletedAt === null,
  };
}

type ProgressSessionRecord = Awaited<ReturnType<typeof usersRepo.findCompletedSessionsForProgress>>[number];

/**
 * Helper - averageScore
 * Summary: Tính điểm trung bình cho một skill từ danh sách completed sessions.
 */
function averageScore(
  sessions: ProgressSessionRecord[],
  key: 'grammarScore' | 'vocabularyScore' | 'naturalnessScore',
) {
  const values = sessions
    .map((session) => session[key])
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

/**
 * Helper - buildWeeklyXp
 * Summary: Tổng hợp XP 7 ngày gần nhất từ các completed session.
 */
function buildWeeklyXp(sessions: ProgressSessionRecord[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, xp: 0 };
  });

  const xpByDate = new Map(days.map((item) => [item.date, item]));

  for (const session of sessions) {
    if (!session.endedAt) continue;
    const key = session.endedAt.toISOString().slice(0, 10);
    const current = xpByDate.get(key);
    if (current) {
      current.xp += session.xpEarned;
    }
  }

  return days;
}

/**
 * Function Objective - getMe
 * Summary: Lấy profile public đầy đủ của user hiện tại.
 * Inputs: userId từ access token đã verify.
 * Behavior: Query profile client-safe -> throw nếu không tồn tại -> bổ sung needsOnboarding.
 * Returns: Object user profile dùng cho màn hình profile hoặc settings.
 */
export async function getMe(userId: string) {
  const user = await usersRepo.findPublicUserProfileById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  return {
    user: buildUserProfile(user),
  };
}

/**
 * Function Objective - updateOnboarding
 * Summary: Lưu kết quả hoặc trạng thái skip của onboarding survey.
 * Inputs: userId và payload onboarding đã validate.
 * Behavior: Kiểm tra user tồn tại -> update survey fields -> đánh dấu onboarding completed.
 * Returns: Cờ updated để client xác nhận lưu thành công.
 */
export async function updateOnboarding(userId: string, input: UpdateOnboardingInput) {
  const user = await usersRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  await usersRepo.updateUserById(userId, {
    learningGoal: input.learningGoal ?? null,
    studyFrequency: input.studyFrequency ?? null,
    selfAssessment: input.selfAssessment ?? null,
    onboardingCompletedAt: new Date(),
  });

  return { updated: true };
}

/**
 * Function Objective - updateMe
 * Summary: Cập nhật profile cơ bản của user hiện tại.
 * Inputs: userId và payload profile đã validate.
 * Behavior: Kiểm tra user tồn tại -> update displayName/avatarUrl -> trả profile mới.
 * Returns: User profile mới sau khi cập nhật thành công.
 */
export async function updateMe(userId: string, input: UpdateMeInput) {
  const user = await usersRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const updatedUser = await usersRepo.updateUserById(userId, {
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
  });

  return {
    user: buildUserProfile({
      id: updatedUser.id,
      email: updatedUser.email,
      googleId: updatedUser.googleId,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      level: updatedUser.level,
      learningGoal: updatedUser.learningGoal,
      studyFrequency: updatedUser.studyFrequency,
      selfAssessment: updatedUser.selfAssessment,
      needsLevelTest: updatedUser.needsLevelTest,
      levelTestedAt: updatedUser.levelTestedAt,
      onboardingCompletedAt: updatedUser.onboardingCompletedAt,
      totalXp: updatedUser.totalXp,
      streakDays: updatedUser.streakDays,
      lastActiveDate: updatedUser.lastActiveDate,
      isAdmin: updatedUser.isAdmin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    }),
  };
}

/**
 * Function Objective - getProgress
 * Summary: Lấy dữ liệu tiến độ học tập để render charts và history.
 * Inputs: userId từ access token đã verify.
 * Behavior: Tải snapshot user + completed sessions -> tính weekly XP, average skill scores và recent history.
 * Returns: Summary tổng quan, skillScores, weeklyXp, sessionsHistory.
 */
export async function getProgress(userId: string) {
  const user = await usersRepo.findProgressUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const sessions = await usersRepo.findCompletedSessionsForProgress(userId);

  return {
    summary: {
      level: user.level,
      totalXp: user.totalXp,
      streakDays: user.streakDays,
      lastActiveDate: user.lastActiveDate,
      completedSessions: sessions.length,
    },
    weeklyXp: buildWeeklyXp(sessions),
    skillScores: {
      grammar: averageScore(sessions, 'grammarScore'),
      vocabulary: averageScore(sessions, 'vocabularyScore'),
      naturalness: averageScore(sessions, 'naturalnessScore'),
    },
    sessionsHistory: sessions.slice(0, 10).map((session) => ({
      id: session.id,
      sceneTitle: session.scene.title,
      category: session.scene.category,
      difficulty: session.scene.difficulty,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      xpEarned: session.xpEarned,
      hintCount: session.hintCount,
      scores: {
        grammar: session.grammarScore,
        vocabulary: session.vocabularyScore,
        naturalness: session.naturalnessScore,
      },
    })),
  };
}

/**
 * Function Objective - getBadges
 * Summary: Lấy danh sách badge/achievement của user hiện tại.
 * Inputs: userId từ access token đã verify.
 * Behavior: Kiểm tra user tồn tại -> tải badge active -> gắn cờ earned -> sắp xếp earned trước.
 * Returns: Summary số badge đã nhận và danh sách badge với earned status.
 */
export async function getBadges(userId: string) {
  const user = await usersRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const badges = (await usersRepo.findActiveBadgesWithEarnedStatus(userId))
    .map((badge) => ({
      id: badge.id,
      title: badge.title,
      description: badge.description,
      iconKey: badge.iconKey,
      conditionType: badge.conditionType,
      conditionValue: badge.conditionValue,
      xpReward: badge.xpReward,
      isEarned: badge.userBadges.length > 0,
      earnedAt: badge.userBadges[0]?.earnedAt ?? null,
    }))
    .sort((a, b) => {
      if (a.isEarned !== b.isEarned) {
        return a.isEarned ? -1 : 1;
      }

      if (a.earnedAt && b.earnedAt) {
        return b.earnedAt.getTime() - a.earnedAt.getTime();
      }

      return a.title.localeCompare(b.title);
    });

  return {
    summary: {
      totalEarned: badges.filter((badge) => badge.isEarned).length,
      totalAvailable: badges.length,
    },
    badges,
  };
}
