import { NotificationCtaType, NotificationType, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  ListNotificationsQuery,
  ReadNotificationParams,
} from '../../schemas/notifications';
import * as notificationsRepo from './notifications.repository';

type DbClient = Prisma.TransactionClient | typeof prisma;
type LearningPlanNotificationType = 'LEARNING_PLAN_READY' | 'LEARNING_PLAN_REFRESHED';

type RewardNotificationInput = {
  userId: string;
  session: {
    id: string;
    sourceType: string;
    sceneId?: string | null;
    sceneTitle: string;
    xpEarned: number;
    grammarScore: number | null;
    vocabularyScore: number | null;
    naturalnessScore: number | null;
  };
  missionsCompleted: Array<{
    id: string;
    missionId: string;
    title: string;
    xp: number;
  }>;
  badgesEarned: Array<{
    id: string;
    title: string;
    xpReward: number;
  }>;
};

type LearningPlanNotificationInput = {
  userId: string;
  type: LearningPlanNotificationType;
  plan: {
    id: string;
    title: string;
    focusSkill: string;
    weeklyTarget: number;
  };
};

type RoadmapCompletedNotificationInput = {
  userId: string;
  planId: string;
  planTitle: string;
  reward: {
    badgeTitle: string;
    xpBonus: number;
    unlocks: string[];
  };
  nextRoadmap: {
    title: string;
    level: string;
    focusSkill: string;
  };
};

type StudyReminderNotificationInput = {
  userId: string;
  planId: string;
  planTitle: string;
  nextSuggestedAt: Date;
};

function mapNotification(record: Awaited<ReturnType<typeof notificationsRepo.findNotificationsPage>>[number]) {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    ctaType: record.ctaType,
    metadata: record.metadata,
    isRead: record.isRead,
    readAt: record.readAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildSessionCompleteNotification(
  input: RewardNotificationInput,
): notificationsRepo.NotificationCreateInput {
  const scoreParts = [
    input.session.grammarScore != null ? `Grammar ${Math.round(input.session.grammarScore)}` : null,
    input.session.vocabularyScore != null ? `Vocabulary ${Math.round(input.session.vocabularyScore)}` : null,
    input.session.naturalnessScore != null ? `Naturalness ${Math.round(input.session.naturalnessScore)}` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    userId: input.userId,
    type: NotificationType.SESSION_COMPLETED,
    title: `Session completed: ${input.session.sceneTitle}`,
    message: scoreParts.length > 0
      ? `You earned ${input.session.xpEarned} XP. ${scoreParts.join(' • ')}.`
      : `You earned ${input.session.xpEarned} XP from ${input.session.sceneTitle}.`,
    ctaType: NotificationCtaType.SESSION_RESULT,
    metadata: {
      sessionId: input.session.id,
      sceneId: input.session.sceneId ?? null,
      sceneTitle: input.session.sceneTitle,
      sourceType: input.session.sourceType,
    },
  };
}

function buildMissionCompleteNotification(
  input: RewardNotificationInput,
): notificationsRepo.NotificationCreateInput | null {
  if (input.missionsCompleted.length === 0) return null;

  const totalXp = input.missionsCompleted.reduce((sum, mission) => sum + mission.xp, 0);
  const titles = input.missionsCompleted.map((mission) => mission.title);

  return {
    userId: input.userId,
    type: NotificationType.MISSION_COMPLETED,
    title: input.missionsCompleted.length === 1
      ? `Mission completed: ${titles[0]}`
      : `${input.missionsCompleted.length} missions completed`,
    message: input.missionsCompleted.length === 1
      ? `You completed a daily mission and earned ${totalXp} bonus XP.`
      : `You completed ${input.missionsCompleted.length} daily missions and earned ${totalXp} bonus XP.`,
    ctaType: NotificationCtaType.MISSIONS,
    metadata: {
      missionIds: input.missionsCompleted.map((mission) => mission.missionId),
      userMissionIds: input.missionsCompleted.map((mission) => mission.id),
      titles,
      totalXp,
      count: input.missionsCompleted.length,
    },
  };
}

function buildBadgeEarnedNotification(
  input: RewardNotificationInput,
): notificationsRepo.NotificationCreateInput | null {
  if (input.badgesEarned.length === 0) return null;

  const totalXp = input.badgesEarned.reduce((sum, badge) => sum + badge.xpReward, 0);
  const titles = input.badgesEarned.map((badge) => badge.title);

  return {
    userId: input.userId,
    type: NotificationType.BADGE_EARNED,
    title: input.badgesEarned.length === 1
      ? `New badge earned: ${titles[0]}`
      : `${input.badgesEarned.length} new badges earned`,
    message: input.badgesEarned.length === 1
      ? `A new achievement has been unlocked. Bonus XP: ${totalXp}.`
      : `You unlocked ${input.badgesEarned.length} achievements. Bonus XP: ${totalXp}.`,
    ctaType: NotificationCtaType.BADGES,
    metadata: {
      badgeIds: input.badgesEarned.map((badge) => badge.id),
      titles,
      totalXp,
      count: input.badgesEarned.length,
    },
  };
}

export async function createRewardNotifications(
  input: RewardNotificationInput,
  db: DbClient = prisma,
) {
  const items = [
    buildSessionCompleteNotification(input),
    buildMissionCompleteNotification(input),
    buildBadgeEarnedNotification(input),
  ].filter((item): item is notificationsRepo.NotificationCreateInput => Boolean(item));

  return notificationsRepo.createNotifications(items, db);
}

export async function createLearningPlanNotification(
  input: LearningPlanNotificationInput,
  db: DbClient = prisma,
) {
  const actionLabel = input.type === NotificationType.LEARNING_PLAN_REFRESHED
    ? 'Learning plan refreshed'
    : 'Learning plan ready';

  return notificationsRepo.createNotification({
    userId: input.userId,
    type: input.type,
    title: actionLabel,
    message: `${input.plan.title} is ready with focus on ${input.plan.focusSkill.toLowerCase()} and ${input.plan.weeklyTarget} session(s) per week.`,
    ctaType: NotificationCtaType.LEARNING_PLAN,
    metadata: {
      planId: input.plan.id,
      title: input.plan.title,
      focusSkill: input.plan.focusSkill,
      weeklyTarget: input.plan.weeklyTarget,
    },
  }, db);
}

export async function createRoadmapCompletedNotification(
  input: RoadmapCompletedNotificationInput,
  db: DbClient = prisma,
) {
  return notificationsRepo.createNotification({
    userId: input.userId,
    type: NotificationType.SYSTEM,
    title: `Roadmap completed: ${input.planTitle}`,
    message: `You completed the roadmap. Reward: ${input.reward.badgeTitle} and ${input.reward.xpBonus} XP bonus.`,
    ctaType: NotificationCtaType.LEARNING_PLAN,
    metadata: {
      eventKind: 'ROADMAP_COMPLETED',
      planId: input.planId,
      reward: input.reward,
      nextRoadmap: input.nextRoadmap,
    },
  }, db);
}

export async function createStudyReminderNotification(
  input: StudyReminderNotificationInput,
  db: DbClient = prisma,
) {
  return notificationsRepo.createNotification({
    userId: input.userId,
    type: NotificationType.SYSTEM,
    title: 'Study reminder',
    message: `Your roadmap suggests a practice session for ${input.planTitle} today.`,
    ctaType: NotificationCtaType.LEARNING_PLAN,
    metadata: {
      eventKind: 'STUDY_REMINDER',
      planId: input.planId,
      nextSuggestedAt: input.nextSuggestedAt.toISOString(),
    },
  }, db);
}

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const unreadOnly = query.unreadOnly === true;
  const skip = (page - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    notificationsRepo.findNotificationsPage(userId, { skip, take: limit, unreadOnly }),
    notificationsRepo.countNotifications(userId, { unreadOnly }),
    notificationsRepo.countUnreadNotifications(userId),
  ]);

  return {
    items: items.map(mapNotification),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: skip + items.length < total,
    },
    unreadCount,
    filters: {
      unreadOnly,
    },
  };
}

export async function markNotificationAsRead(userId: string, params: ReadNotificationParams) {
  const existing = await notificationsRepo.findOwnedNotificationById(userId, params.id);
  if (!existing) {
    throw Object.assign(new Error('Thông báo không tồn tại'), {
      code: 'NOT_FOUND',
      status: 404,
    });
  }

  if (existing.isRead) {
    return {
      notification: mapNotification(existing),
      updated: false,
    };
  }

  const updated = await notificationsRepo.updateNotificationById(existing.id, {
    isRead: true,
    readAt: new Date(),
  });

  return {
    notification: mapNotification(updated),
    updated: true,
  };
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await notificationsRepo.updateManyNotificationsForUser(
    userId,
    { isRead: false },
    {
      isRead: true,
      readAt: new Date(),
    },
  );

  return {
    updatedCount: result.count,
  };
}
