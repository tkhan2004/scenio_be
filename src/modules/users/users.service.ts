import { ConditionType, MissionType, NotificationType, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AddXpInput, UpdateMeInput, UpdateOnboardingInput } from '../../schemas/users';
import * as missionsService from '../missions/missions.service';
import * as learningPlanService from '../learning-plan/learning-plan.service';
import * as notificationsService from '../notifications/notifications.service';
import * as usersRepo from './users.repository';

function buildUserProfile(user: NonNullable<Awaited<ReturnType<typeof usersRepo.findPublicUserProfileById>>>) {
  return {
    ...user,
    needsOnboarding: user.onboardingCompletedAt === null,
  };
}

type ProgressSessionRecord = Awaited<ReturnType<typeof usersRepo.findCompletedSessionsForProgress>>[number];
type TodayMissionRecord = Awaited<ReturnType<typeof usersRepo.findTodayUserMissions>>[number];
type BadgeRecord = Awaited<ReturnType<typeof usersRepo.findActiveBadgesWithEarnedStatus>>[number];
type RewardGrantResult = {
  totalXp: number;
  streakDays: number;
  missionsCompleted: Array<{
    id: string;
    missionId: string;
    title: string;
    description: string;
    missionType: string;
    target: number;
    current: number;
    xp: number;
    completedAt: Date | null;
  }>;
  badgesEarned: Array<{
    id: string;
    title: string;
    xpReward: number;
  }>;
};

/**
 * Helper - getTodayDateString
 * Summary: Trả về ngày hiện tại dạng YYYY-MM-DD để đồng bộ với user_missions.
 */
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Helper - dateFromDateString
 * Summary: Chuyển YYYY-MM-DD thành Date UTC midnight cho field lastActiveDate.
 */
function dateFromDateString(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

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
 * Helper - getSessionAverageScore
 * Summary: Tính điểm trung bình của một session từ 3 trục grammar/vocabulary/naturalness.
 */
function getSessionAverageScore(session: {
  grammarScore: number | null;
  vocabularyScore: number | null;
  naturalnessScore: number | null;
}) {
  const values = [session.grammarScore, session.vocabularyScore, session.naturalnessScore]
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

/**
 * Helper - getHighestAverageScore
 * Summary: Lấy average score cao nhất từ toàn bộ completed sessions.
 */
function getHighestAverageScore(
  sessions: Awaited<ReturnType<typeof usersRepo.findCompletedSessionScores>>,
) {
  if (sessions.length === 0) return 0;

  return Math.max(...sessions.map((session) => getSessionAverageScore(session)));
}

/**
 * Helper - calculateNextStreak
 * Summary: Tính streak kế tiếp dựa trên lastActiveDate hiện tại và ngày hôm nay.
 */
function calculateNextStreak(currentStreak: number, lastActiveDate: Date | null, today: string) {
  if (!lastActiveDate) {
    return 1;
  }

  const lastDate = lastActiveDate.toISOString().slice(0, 10);
  if (lastDate === today) {
    return currentStreak;
  }

  const yesterday = dateFromDateString(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (lastDate === yesterdayKey) {
    return currentStreak + 1;
  }

  return 1;
}

/**
 * Helper - getNextMissionValue
 * Summary: Tính progress mới cho từng loại mission khi session được grant XP.
 */
function getNextMissionValue(mission: TodayMissionRecord, sessionAverageScore: number, nextStreak: number) {
  switch (mission.mission.missionType) {
    case MissionType.COMPLETE_SCENE:
      return mission.currentValue + 1;
    case MissionType.ACHIEVE_SCORE:
      return Math.max(mission.currentValue, sessionAverageScore);
    case MissionType.MAINTAIN_STREAK:
      return Math.max(mission.currentValue, nextStreak);
    case MissionType.SAVE_VOCABULARY:
    default:
      return mission.currentValue;
  }
}

/**
 * Helper - isBadgeEligible
 * Summary: Kiểm tra user đã đủ điều kiện để nhận badge hay chưa.
 */
function isBadgeEligible(
  badge: BadgeRecord,
  metrics: {
    completedSessions: number;
    streakDays: number;
    highestAverageScore: number;
    savedVocabulary: number;
  },
) {
  switch (badge.conditionType) {
    case ConditionType.FIRST_SESSION:
      return metrics.completedSessions >= badge.conditionValue;
    case ConditionType.SCENES_COMPLETED:
      return metrics.completedSessions >= badge.conditionValue;
    case ConditionType.STREAK_DAYS:
      return metrics.streakDays >= badge.conditionValue;
    case ConditionType.HIGH_SCORE:
      return metrics.highestAverageScore >= badge.conditionValue;
    case ConditionType.PERFECT_SCORE:
      return metrics.highestAverageScore >= badge.conditionValue;
    case ConditionType.VOCAB_SAVED:
      return metrics.savedVocabulary >= badge.conditionValue;
    default:
      return false;
  }
}

/**
 * Function Objective - grantCompletedSessionRewards
 * Summary: Thực hiện reward pipeline cho một session COMPLETED trong cùng transaction.
 * Inputs: userId, sessionId, transaction client, và ngày hiện tại dạng YYYY-MM-DD.
 * Behavior: Kiểm tra idempotent qua xpGrantedAt -> cập nhật user, missions, badges, và đánh dấu session đã grant XP.
 * Returns: totalXp mới, streakDays mới, và missions vừa complete ở lần grant này.
 */
export async function grantCompletedSessionRewards(
  userId: string,
  sessionId: string,
  tx: Prisma.TransactionClient,
  today: string,
): Promise<RewardGrantResult> {
  const user = await usersRepo.findUserById(userId, tx);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const session = await usersRepo.findSessionForXpGrant(userId, sessionId, tx);
  if (!session) {
    throw Object.assign(new Error('Phiên học không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  if (session.status !== 'COMPLETED') {
    throw Object.assign(new Error('Chỉ có thể cộng XP cho session đã hoàn thành'), {
      code: 'SESSION_NOT_COMPLETED',
      status: 409,
    });
  }

  if (session.xpGrantedAt) {
    return {
      totalXp: user.totalXp,
      streakDays: user.streakDays,
      missionsCompleted: [],
      badgesEarned: [],
    };
  }

  const sessionAverageScore = getSessionAverageScore(session);
  const nextStreak = calculateNextStreak(user.streakDays, user.lastActiveDate, today);
  const todayMissions = await usersRepo.findTodayUserMissions(userId, today, tx);

  let missionBonusXp = 0;
  const missionsCompleted: RewardGrantResult['missionsCompleted'] = [];

  for (const mission of todayMissions) {
    const nextValue = getNextMissionValue(mission, sessionAverageScore, nextStreak);
    const shouldComplete = !mission.isCompleted && nextValue >= mission.mission.targetValue;
    const shouldUpdate = nextValue !== mission.currentValue || shouldComplete;

    if (!shouldUpdate) {
      continue;
    }

    const completedAt = shouldComplete ? new Date() : mission.completedAt;
    const updatedMission = await usersRepo.updateUserMissionById(
      mission.id,
      {
        currentValue: nextValue,
        isCompleted: mission.isCompleted || shouldComplete,
        completedAt,
      },
      tx,
    );

    if (shouldComplete) {
      missionBonusXp += updatedMission.mission.xpReward;
      missionsCompleted.push({
        id: updatedMission.id,
        missionId: updatedMission.missionId,
        title: updatedMission.mission.title,
        description: updatedMission.mission.description,
        missionType: updatedMission.mission.missionType,
        target: updatedMission.mission.targetValue,
        current: updatedMission.currentValue,
        xp: updatedMission.mission.xpReward,
        completedAt: updatedMission.completedAt,
      });
    }
  }

  const [completedSessions, completedSessionScores, savedVocabulary, badges] = await Promise.all([
    usersRepo.countCompletedSessions(userId, tx),
    usersRepo.findCompletedSessionScores(userId, tx),
    usersRepo.countSavedVocabulary(userId, tx),
    usersRepo.findActiveBadgesWithEarnedStatus(userId, tx),
  ]);

  const highestAverageScore = Math.max(
    sessionAverageScore,
    getHighestAverageScore(completedSessionScores),
  );

  let badgeBonusXp = 0;
  const badgesEarned: RewardGrantResult['badgesEarned'] = [];
  for (const badge of badges) {
    if (badge.userBadges.length > 0) {
      continue;
    }

    const eligible = isBadgeEligible(badge, {
      completedSessions,
      streakDays: nextStreak,
      highestAverageScore,
      savedVocabulary,
    });

    if (!eligible) {
      continue;
    }

    await usersRepo.createUserBadge(
      {
        userId,
        badgeId: badge.id,
        earnedAt: new Date(),
      },
      tx,
    );
    badgeBonusXp += badge.xpReward;
    badgesEarned.push({
      id: badge.id,
      title: badge.title,
      xpReward: badge.xpReward,
    });
  }

  const updatedUser = await usersRepo.updateUserById(
    userId,
    {
      totalXp: {
        increment: session.xpEarned + missionBonusXp + badgeBonusXp,
      },
      streakDays: nextStreak,
      lastActiveDate: dateFromDateString(today),
    },
    tx,
  );

  await usersRepo.updateSessionById(
    session.id,
    {
      xpGrantedAt: new Date(),
    },
    tx,
  );

  await notificationsService.createRewardNotifications({
    userId,
    session: {
      id: session.id,
      sourceType: session.sourceType,
      sceneId: session.sceneId,
      sceneTitle: session.sourceType === 'CUSTOM_PRACTICE'
        ? session.customPracticeConfig?.displayTitle ?? 'Custom Practice'
        : session.scene?.title ?? 'Practice Session',
      xpEarned: session.xpEarned,
      grammarScore: session.grammarScore,
      vocabularyScore: session.vocabularyScore,
      naturalnessScore: session.naturalnessScore,
    },
    missionsCompleted,
    badgesEarned,
  }, tx);

  return {
    totalXp: updatedUser.totalXp,
    streakDays: updatedUser.streakDays,
    missionsCompleted,
    badgesEarned,
  };
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
    ...(input.level ? { level: input.level, needsLevelTest: false } : {}),
    learningGoal: input.learningGoal ?? null,
    studyFrequency: input.studyFrequency ?? null,
    selfAssessment: input.selfAssessment ?? null,
    onboardingCompletedAt: new Date(),
  });
  await learningPlanService.generateLearningPlanBestEffort(userId, {
    notify: true,
    notificationType: NotificationType.LEARNING_PLAN_READY,
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
 * Function Objective - addXp
 * Summary: Cộng XP cho session COMPLETED, đồng thời cập nhật streak và daily missions.
 * Inputs: userId từ access token và sessionId đã validate.
 * Behavior: Đảm bảo mission hôm nay tồn tại -> kiểm tra idempotent qua xpGrantedAt -> update session/user/missions/badges trong transaction.
 * Returns: totalXp mới, streakDays mới, và danh sách missions vừa complete ở lần grant này.
 */
export async function addXp(userId: string, input: AddXpInput) {
  const today = getTodayDateString();
  await missionsService.ensureTodayMissions(userId, today);

  return prisma.$transaction((tx) => grantCompletedSessionRewards(userId, input.sessionId, tx, today));
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
      sourceType: session.sourceType,
      sceneTitle: session.sourceType === 'CUSTOM_PRACTICE'
        ? session.customPracticeConfig?.displayTitle ?? 'Custom Practice'
        : session.scene?.title ?? 'Unknown Scene',
      category: session.sourceType === 'CUSTOM_PRACTICE'
        ? session.customPracticeConfig?.contextType ?? 'CUSTOM'
        : session.scene?.category ?? 'DAILY',
      difficulty: session.sourceType === 'CUSTOM_PRACTICE'
        ? session.customPracticeConfig?.difficulty ?? user.level
        : session.scene?.difficulty ?? user.level,
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
