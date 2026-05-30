import { ConditionType, Prisma } from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

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
 * Repository - Users
 * Summary: Quản lý truy vấn dữ liệu cho user profile, progress, badges, và reward flow.
 */

/**
 * Query Objective - findUserById
 * Summary: Lấy user theo id để kiểm tra tồn tại hoặc đọc progress hiện tại.
 * Query Shape: findUnique theo id.
 */
export async function findUserById(id: string, db: DbClient = prisma) {
  return db.user.findUnique({
    where: { id },
  });
}

/**
 * Query Objective - updateUserById
 * Summary: Cập nhật dữ liệu onboarding, profile, hoặc chỉ số gamification của user.
 * Query Shape: update theo id với Prisma.UserUpdateInput.
 */
export async function updateUserById(id: string, data: Prisma.UserUpdateInput, db: DbClient = prisma) {
  return db.user.update({
    where: { id },
    data,
  });
}

/**
 * Query Objective - findPublicUserProfileById
 * Summary: Lấy đầy đủ profile public của user hiện tại cho màn hình profile.
 * Query Shape: findUnique + select toàn bộ field client-safe, không gồm password.
 */
export async function findPublicUserProfileById(id: string, db: DbClient = prisma) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      googleId: true,
      displayName: true,
      avatarUrl: true,
      level: true,
      targetLevel: true,
      learningGoal: true,
      learningGoals: true,
      practiceContexts: true,
      focusSkills: true,
      studyFrequency: true,
      selfAssessment: true,
      dailyPracticeMinutes: true,
      targetOutcome: true,
      correctionPreference: true,
      needsLevelTest: true,
      levelTestedAt: true,
      onboardingCompletedAt: true,
      totalXp: true,
      streakDays: true,
      lastActiveDate: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Query Objective - findProgressUserById
 * Summary: Lấy snapshot tiến độ tổng quan của user cho progress screen.
 * Query Shape: findUnique + select level, totalXp, streakDays, lastActiveDate.
 */
export async function findProgressUserById(id: string, db: DbClient = prisma) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      level: true,
      targetLevel: true,
      totalXp: true,
      streakDays: true,
      lastActiveDate: true,
    },
  });
}

/**
 * Query Objective - findCompletedSessionsForProgress
 * Summary: Lấy toàn bộ completed sessions cần thiết để tính biểu đồ và history.
 * Query Shape: findMany theo userId + status COMPLETED, include scene summary.
 */
export async function findCompletedSessionsForProgress(userId: string, db: DbClient = prisma) {
  return db.session.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    orderBy: {
      endedAt: 'desc',
    },
    select: {
      id: true,
      sourceType: true,
      startedAt: true,
      endedAt: true,
      xpEarned: true,
      hintCount: true,
      grammarScore: true,
      vocabularyScore: true,
      naturalnessScore: true,
      scene: {
        select: {
          title: true,
          category: true,
          difficulty: true,
        },
      },
      customPracticeConfig: {
        select: {
          displayTitle: true,
          contextType: true,
          difficulty: true,
        },
      },
    },
  });
}

/**
 * Query Objective - findActiveBadgesWithEarnedStatus
 * Summary: Lấy tất cả badge active cùng trạng thái earned của user hiện tại.
 * Query Shape: findMany badge active + include userBadges filtered by userId.
 */
export async function findActiveBadgesWithEarnedStatus(userId: string, db: DbClient = prisma) {
  return db.badge.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ xpReward: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      iconKey: true,
      conditionType: true,
      conditionValue: true,
      xpReward: true,
      userBadges: {
        where: { userId },
        select: {
          earnedAt: true,
        },
        take: 1,
      },
    },
  });
}

/**
 * Query Objective - findBadgeByTitleAndConditionType
 * Summary: Tìm badge definition theo title và conditionType để grant roadmap badge hoặc badge hệ thống đặc thù.
 * Query Shape: findFirst theo title + conditionType.
 */
export async function findBadgeByTitleAndConditionType(
  title: string,
  conditionType: ConditionType,
  db: DbClient = prisma,
) {
  return db.badge.findFirst({
    where: {
      title,
      conditionType,
    },
    select: {
      id: true,
      title: true,
      description: true,
      iconKey: true,
      conditionType: true,
      conditionValue: true,
      xpReward: true,
      isActive: true,
    },
  });
}

/**
 * Query Objective - createBadge
 * Summary: Tạo badge definition mới khi runtime cần một achievement chưa có sẵn trong seed.
 * Query Shape: create vào bảng badges.
 */
export async function createBadge(
  data: Prisma.BadgeCreateInput,
  db: DbClient = prisma,
) {
  return db.badge.create({
    data,
    select: {
      id: true,
      title: true,
      description: true,
      iconKey: true,
      conditionType: true,
      conditionValue: true,
      xpReward: true,
      isActive: true,
    },
  });
}

/**
 * Query Objective - updateBadgeById
 * Summary: Đồng bộ lại badge definition hiện có khi reward/icon/description thay đổi theo feature mới.
 * Query Shape: update theo badgeId.
 */
export async function updateBadgeById(
  badgeId: string,
  data: Prisma.BadgeUpdateInput,
  db: DbClient = prisma,
) {
  return db.badge.update({
    where: { id: badgeId },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      iconKey: true,
      conditionType: true,
      conditionValue: true,
      xpReward: true,
      isActive: true,
    },
  });
}

/**
 * Query Objective - findSessionForXpGrant
 * Summary: Lấy session COMPLETED để cộng XP, kèm cờ xpGrantedAt cho idempotency.
 * Query Shape: findFirst theo sessionId + userId.
 */
export async function findSessionForXpGrant(userId: string, sessionId: string, db: DbClient = prisma) {
  return db.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      status: true,
      grammarScore: true,
      vocabularyScore: true,
      naturalnessScore: true,
      xpEarned: true,
      xpGrantedAt: true,
      endedAt: true,
      sourceType: true,
      sceneId: true,
      scene: {
        select: {
          title: true,
        },
      },
      customPracticeConfig: {
        select: {
          displayTitle: true,
        },
      },
    },
  });
}

/**
 * Query Objective - updateSessionById
 * Summary: Cập nhật metadata session theo id, dùng để đánh dấu đã grant XP.
 * Query Shape: update theo sessionId.
 */
export async function updateSessionById(
  sessionId: string,
  data: Prisma.SessionUpdateInput,
  db: DbClient = prisma,
) {
  return db.session.update({
    where: { id: sessionId },
    data,
    select: {
      id: true,
      xpGrantedAt: true,
    },
  });
}

/**
 * Query Objective - findTodayUserMissions
 * Summary: Lấy daily missions của user trong ngày để update progress.
 * Query Shape: findMany theo userId + date, include mission metadata.
 */
export async function findTodayUserMissions(userId: string, date: string, db: DbClient = prisma) {
  return db.userMission.findMany({
    where: {
      userId,
      date,
    },
    orderBy: [{ missionId: 'asc' }],
    select: todayMissionSelect,
  });
}

/**
 * Query Objective - updateUserMissionById
 * Summary: Cập nhật progress/completion cho một user mission cụ thể.
 * Query Shape: update theo userMissionId.
 */
export async function updateUserMissionById(
  id: string,
  data: Prisma.UserMissionUpdateInput,
  db: DbClient = prisma,
) {
  return db.userMission.update({
    where: { id },
    data,
    select: todayMissionSelect,
  });
}

/**
 * Query Objective - countCompletedSessions
 * Summary: Đếm số session COMPLETED của user để xét badge.
 * Query Shape: count theo userId + status COMPLETED.
 */
export async function countCompletedSessions(userId: string, db: DbClient = prisma) {
  return db.session.count({
    where: {
      userId,
      status: 'COMPLETED',
    },
  });
}

/**
 * Query Objective - findCompletedSessionScores
 * Summary: Lấy điểm của completed sessions để tính high score badge.
 * Query Shape: findMany theo userId + status COMPLETED.
 */
export async function findCompletedSessionScores(userId: string, db: DbClient = prisma) {
  return db.session.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    select: {
      grammarScore: true,
      vocabularyScore: true,
      naturalnessScore: true,
    },
  });
}

/**
 * Query Objective - countSavedVocabulary
 * Summary: Đếm tổng số user vocabulary đã lưu để xét badge VOCAB_SAVED.
 * Query Shape: count theo userId.
 */
export async function countSavedVocabulary(userId: string, db: DbClient = prisma) {
  return db.userVocabulary.count({
    where: { userId },
  });
}

/**
 * Query Objective - createUserBadge
 * Summary: Tạo bản ghi earned badge mới cho user.
 * Query Shape: create vào user_badges.
 */
export async function createUserBadge(
  data: { userId: string; badgeId: string; earnedAt: Date },
  db: DbClient = prisma,
) {
  return db.userBadge.create({
    data,
    select: {
      id: true,
      earnedAt: true,
    },
  });
}

/**
 * Query Objective - findUserBadgeByBadgeId
 * Summary: Kiểm tra user đã nhận badge cụ thể hay chưa để giữ grant badge idempotent.
 * Query Shape: findUnique theo composite userId_badgeId.
 */
export async function findUserBadgeByBadgeId(
  userId: string,
  badgeId: string,
  db: DbClient = prisma,
) {
  return db.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId,
      },
    },
    select: {
      id: true,
      earnedAt: true,
    },
  });
}
