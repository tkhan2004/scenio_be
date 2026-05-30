import { ConditionType, Level, MissionType, NotificationType, Prisma } from '@prisma/client';
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

const LEVEL_ORDER: Level[] = [Level.A1, Level.A2, Level.B1, Level.B2];
const LEVEL_PROGRESS_REQUIRED_AVERAGE_SCORE = 75;
const LEVEL_PROGRESS_REQUIRED_SESSIONS = 5;

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

function hasOwnField<T extends object>(value: T, key: keyof any) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

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

function getNextLevel(level: Level) {
  const index = LEVEL_ORDER.indexOf(level);
  return index >= 0 && index < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[index + 1] : null;
}

function getRecentAverageScore(sessions: ProgressSessionRecord[]) {
  const recentSessions = sessions.slice(0, LEVEL_PROGRESS_REQUIRED_SESSIONS);
  if (recentSessions.length === 0) return 0;

  const total = recentSessions.reduce((sum, session) => sum + getSessionAverageScore(session), 0);
  return Math.round(total / recentSessions.length);
}

function buildLevelProgress(args: {
  currentLevel: Level;
  targetLevel: Level | null;
  sessions: ProgressSessionRecord[];
}) {
  const targetLevel = args.targetLevel ?? getNextLevel(args.currentLevel);
  const nextLevel = targetLevel && targetLevel !== args.currentLevel ? targetLevel : getNextLevel(args.currentLevel);
  const recentAverageScore = getRecentAverageScore(args.sessions);
  const completedSessions = args.sessions.length;

  return {
    currentLevel: args.currentLevel,
    targetLevel,
    recentAverageScore,
    requiredAverageScore: LEVEL_PROGRESS_REQUIRED_AVERAGE_SCORE,
    completedSessions,
    requiredSessions: LEVEL_PROGRESS_REQUIRED_SESSIONS,
    canLevelUp: Boolean(
      nextLevel
      && completedSessions >= LEVEL_PROGRESS_REQUIRED_SESSIONS
      && recentAverageScore >= LEVEL_PROGRESS_REQUIRED_AVERAGE_SCORE,
    ),
    nextLevel,
  };
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
    case ConditionType.ROADMAP_COMPLETED:
      return false;
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

  const nextLevel = hasOwnField(input, 'level') ? input.level ?? user.level : user.level;
  const nextTargetLevel = hasOwnField(input, 'targetLevel') ? input.targetLevel ?? null : user.targetLevel;
  const nextLearningGoals = hasOwnField(input, 'learningGoals')
    ? input.learningGoals ?? []
    : user.learningGoals.length > 0
      ? user.learningGoals
      : user.learningGoal
        ? [user.learningGoal]
        : [];
  const nextPracticeContexts = hasOwnField(input, 'practiceContexts')
    ? input.practiceContexts ?? []
    : user.practiceContexts;
  const nextFocusSkills = hasOwnField(input, 'focusSkills')
    ? input.focusSkills ?? []
    : user.focusSkills.length > 0
      ? user.focusSkills
      : user.selfAssessment
        ? [user.selfAssessment]
        : [];
  const nextStudyFrequency = hasOwnField(input, 'studyFrequency') ? input.studyFrequency ?? null : user.studyFrequency;
  const nextDailyPracticeMinutes = hasOwnField(input, 'dailyPracticeMinutes')
    ? input.dailyPracticeMinutes ?? null
    : user.dailyPracticeMinutes;
  const nextTargetOutcome = hasOwnField(input, 'targetOutcome') ? input.targetOutcome ?? null : user.targetOutcome;
  const nextCorrectionPreference = hasOwnField(input, 'correctionPreference')
    ? input.correctionPreference ?? null
    : user.correctionPreference;
  const nextLegacyLearningGoal = nextLearningGoals[0]
    ?? (hasOwnField(input, 'learningGoal') ? input.learningGoal ?? null : user.learningGoal);
  const nextLegacySelfAssessment = nextFocusSkills[0]
    ?? (hasOwnField(input, 'selfAssessment') ? input.selfAssessment ?? null : user.selfAssessment);

  const updatedUser = await usersRepo.updateUserById(userId, {
    ...(hasOwnField(input, 'level') ? { level: nextLevel, needsLevelTest: false } : {}),
    targetLevel: nextTargetLevel,
    learningGoal: nextLegacyLearningGoal,
    learningGoals: { set: nextLearningGoals },
    practiceContexts: { set: nextPracticeContexts },
    focusSkills: { set: nextFocusSkills },
    studyFrequency: nextStudyFrequency,
    selfAssessment: nextLegacySelfAssessment,
    dailyPracticeMinutes: nextDailyPracticeMinutes,
    targetOutcome: nextTargetOutcome,
    correctionPreference: nextCorrectionPreference,
    onboardingCompletedAt: new Date(),
  });

  await learningPlanService.generateLearningPlanBestEffort(userId, {
    notify: true,
    notificationType: NotificationType.LEARNING_PLAN_READY,
  });

  return {
    updated: true,
    user: {
      level: updatedUser.level,
      targetLevel: updatedUser.targetLevel,
      learningGoals: updatedUser.learningGoals,
      practiceContexts: updatedUser.practiceContexts,
      focusSkills: updatedUser.focusSkills,
      studyFrequency: updatedUser.studyFrequency,
      dailyPracticeMinutes: updatedUser.dailyPracticeMinutes,
      targetOutcome: updatedUser.targetOutcome,
      correctionPreference: updatedUser.correctionPreference,
      needsOnboarding: updatedUser.onboardingCompletedAt === null,
    },
  };
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

  const profile = await usersRepo.findPublicUserProfileById(updatedUser.id);
  if (!profile) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  return {
    user: buildUserProfile(profile),
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
  const levelProgress = buildLevelProgress({
    currentLevel: user.level,
    targetLevel: user.targetLevel,
    sessions,
  });

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
    levelProgress,
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
