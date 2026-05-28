import {
  ErrorType,
  LearningFocusSkill,
  LearningPlanStepStatus,
  LearningPlanStepType,
  Level,
  NotificationType,
  Prisma,
} from '@prisma/client';
import prisma from '../../config/database';
import { CompleteLearningPlanStepParams } from '../../schemas/learning-plan';
import * as notificationsService from '../notifications/notifications.service';
import * as scenesService from '../scenes/scenes.service';
import * as usersRepo from '../users/users.repository';
import * as learningPlanRepo from './learning-plan.repository';

type PlanRecord = learningPlanRepo.LearningPlanRecord;
type RecentPlanSession = Awaited<ReturnType<typeof learningPlanRepo.findRecentSessionsForPlan>>[number];
type RoadmapWindowSession = Awaited<ReturnType<typeof learningPlanRepo.findCompletedSessionsForRoadmapWindow>>[number];
type LearningPlanNotificationKind = 'LEARNING_PLAN_READY' | 'LEARNING_PLAN_REFRESHED';
type ScheduleDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
type RoadmapDerivedState = 'IN_PROGRESS' | 'COMPLETED';
type LearningPlanResponse = {
  plan: {
    id: string;
    status: PlanRecord['status'];
    derivedState: RoadmapDerivedState;
    title: string;
    summary: string;
    level: Level;
    learningGoal: string | null;
    studyFrequency: string | null;
    focusSkill: LearningFocusSkill;
    weeklyTarget: number;
    generatedBy: string;
    sourceSnapshot: PlanRecord['sourceSnapshot'];
    targetOutcome: string;
    completionCriteria: {
      requiredSteps: number;
      requiredCoreScenes: number;
      minimumRecentAverageScore: number;
    };
    reward: {
      badgeTitle: string;
      xpBonus: number;
      unlocks: string[];
    };
    schedule: {
      suggestedDays: ScheduleDay[];
      nextSuggestedAt: Date | null;
    };
    createdAt: Date;
    updatedAt: Date;
  };
  steps: Array<{
    id: string;
    type: PlanRecord['steps'][number]['type'];
    status: PlanRecord['steps'][number]['status'];
    focusSkill: LearningFocusSkill;
    sceneId: string | null;
    title: string;
    description: string | null;
    reason: string | null;
    sortOrder: number;
    targetCount: number;
    completedCount: number;
    metadata: Record<string, unknown>;
    scene: PlanRecord['steps'][number]['scene'];
  }>;
  nextStep: {
    id: string;
    type: PlanRecord['steps'][number]['type'];
    sceneId: string | null;
    title: string;
    focusSkill: LearningFocusSkill;
  } | null;
  completionSummary: {
    planId: string;
    title: string;
    level: Level;
    completedAt: Date;
    completedScenes: string[];
    scoreDelta: {
      grammar: { before: number; after: number };
      vocabulary: { before: number; after: number };
      naturalness: { before: number; after: number };
    };
    reward: {
      badgeTitle: string;
      xpBonus: number;
    };
    nextRoadmap: {
      title: string;
      level: Level;
      focusSkill: LearningFocusSkill;
    };
  } | null;
};

type RoadmapMeta = {
  targetOutcome: string;
  completionCriteria: {
    requiredSteps: number;
    requiredCoreScenes: number;
    minimumRecentAverageScore: number;
  };
  reward: {
    badgeTitle: string;
    xpBonus: number;
    unlocks: string[];
  };
  baselineScores: {
    grammar: number | null;
    vocabulary: number | null;
    naturalness: number | null;
  };
};

type RoadmapLifecycle = {
  completedAt?: string | null;
  rewardGrantedAt?: string | null;
  completionNotificationSentAt?: string | null;
  lastReminderDate?: string | null;
  nextRoadmapStartedAt?: string | null;
};

type RoadmapSnapshot = {
  selfAssessment?: string | null;
  recentSessionCount?: number;
  roadmapMeta?: RoadmapMeta;
  roadmapLifecycle?: RoadmapLifecycle;
};

type LearningPlanUserContext = NonNullable<
  Awaited<ReturnType<typeof learningPlanRepo.findUserLearningContext>>
>;

const STUDY_FREQUENCY_WEEKLY_TARGET: Record<string, number> = {
  LIGHT: 2,
  REGULAR: 3,
  INTENSIVE: 5,
};

const SUGGESTED_DAYS_BY_FREQUENCY: Record<string, ScheduleDay[]> = {
  LIGHT: ['TUE', 'THU'],
  REGULAR: ['TUE', 'THU', 'SAT'],
  INTENSIVE: ['MON', 'TUE', 'THU', 'SAT', 'SUN'],
};

const DAY_ORDER: ScheduleDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MINIMUM_RECENT_AVERAGE_SCORE = 70;
const DEFAULT_ROADMAP_XP_BONUS = 120;
const SCENE_STEP_TYPES = new Set<LearningPlanStepType>([
  LearningPlanStepType.SCENE,
  LearningPlanStepType.RETRY_SCENE,
]);

function mapSelfAssessmentToFocus(selfAssessment: string | null): LearningFocusSkill {
  switch (selfAssessment) {
    case 'GRAMMAR':
      return LearningFocusSkill.GRAMMAR;
    case 'VOCABULARY':
      return LearningFocusSkill.VOCABULARY;
    case 'CONFIDENCE':
      return LearningFocusSkill.CONFIDENCE;
    case 'NATURALNESS':
    default:
      return LearningFocusSkill.NATURALNESS;
  }
}

function getWeeklyTarget(studyFrequency: string | null) {
  return STUDY_FREQUENCY_WEEKLY_TARGET[studyFrequency ?? 'REGULAR'] ?? 3;
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return Number.MAX_SAFE_INTEGER;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function averageOrNull(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function roundAverageScore(session: {
  grammarScore: number | null;
  vocabularyScore: number | null;
  naturalnessScore: number | null;
}) {
  return averageOrNull([
    session.grammarScore,
    session.vocabularyScore,
    session.naturalnessScore,
  ]);
}

function getFocusFromSessions(sessions: RecentPlanSession[], selfAssessment: string | null) {
  if (sessions.length === 0) return mapSelfAssessmentToFocus(selfAssessment);

  const scoreEntries: Array<[LearningFocusSkill, number]> = [
    [LearningFocusSkill.GRAMMAR, average(sessions.map((session) => session.grammarScore))],
    [LearningFocusSkill.VOCABULARY, average(sessions.map((session) => session.vocabularyScore))],
    [LearningFocusSkill.NATURALNESS, average(sessions.map((session) => session.naturalnessScore))],
  ];

  return scoreEntries.sort((a, b) => a[1] - b[1])[0][0];
}

function focusToRecommendSkill(focus: LearningFocusSkill) {
  switch (focus) {
    case LearningFocusSkill.GRAMMAR:
      return LearningFocusSkill.VOCABULARY;
    case LearningFocusSkill.VOCABULARY:
      return LearningFocusSkill.NATURALNESS;
    case LearningFocusSkill.NATURALNESS:
      return LearningFocusSkill.CONFIDENCE;
    case LearningFocusSkill.CONFIDENCE:
    default:
      return LearningFocusSkill.GRAMMAR;
  }
}

function getGoalLabel(goal: string | null) {
  return {
    WORK: 'Work English',
    TRAVEL: 'Travel English',
    DAILY: 'Daily English',
    ALL: 'Everyday English',
  }[goal ?? 'ALL'] ?? 'Everyday English';
}

function getPlanTitle(goal: string | null, level: Level) {
  return `${getGoalLabel(goal)} ${level} Roadmap`;
}

function getPlanSummary(args: {
  goal: string | null;
  level: Level;
  focusSkill: LearningFocusSkill;
  weeklyTarget: number;
}) {
  return `Lộ trình ${args.weeklyTarget} buổi/tuần cho trình độ ${args.level}, ưu tiên ${args.focusSkill.toLowerCase()} theo mục tiêu ${args.goal || 'GENERAL_ENGLISH'}.`;
}

function getTargetOutcome(goal: string | null, level: Level) {
  switch (goal) {
    case 'WORK':
      return `Handle 4 everyday work situations clearly at ${level} level.`;
    case 'TRAVEL':
      return `Handle 4 everyday travel situations clearly at ${level} level.`;
    case 'DAILY':
      return `Manage 4 daily-life conversations with clearer replies at ${level} level.`;
    case 'ALL':
    case null:
    default:
      return `Complete short real-life English conversations more clearly at ${level} level.`;
  }
}

function getCompletionCriteria(stepCount: number, coreSceneCount: number) {
  return {
    requiredSteps: Math.max(1, Math.min(stepCount, 5)),
    requiredCoreScenes: Math.max(1, Math.min(coreSceneCount, 4)),
    minimumRecentAverageScore: MINIMUM_RECENT_AVERAGE_SCORE,
  };
}

function getRoadmapReward(goal: string | null, level: Level) {
  return {
    badgeTitle: `${level} ${getGoalLabel(goal)} Roadmap`,
    xpBonus: DEFAULT_ROADMAP_XP_BONUS,
    unlocks: ['Next roadmap suggestion'],
  };
}

function getStepReason(focusSkill: LearningFocusSkill, fallbackReason?: string | null) {
  if (fallbackReason) return fallbackReason;
  if (focusSkill === LearningFocusSkill.GRAMMAR) return 'Practice clearer sentence structure and question forms.';
  if (focusSkill === LearningFocusSkill.VOCABULARY) return 'Review useful words and phrases in context.';
  if (focusSkill === LearningFocusSkill.CONFIDENCE) return 'Build confidence with short, repeatable speaking turns.';
  return 'Improve natural conversation flow and polite responses.';
}

function getSuggestedDays(studyFrequency: string | null): ScheduleDay[] {
  return SUGGESTED_DAYS_BY_FREQUENCY[studyFrequency ?? 'REGULAR'] ?? SUGGESTED_DAYS_BY_FREQUENCY.REGULAR;
}

function getScheduleDayKey(date: Date): ScheduleDay {
  return DAY_ORDER[date.getUTCDay()];
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildNextSuggestedAt(suggestedDays: ScheduleDay[], lastActiveDate: Date | null) {
  const now = new Date();
  const todayKey = getDateKey(now);
  const lastActiveKey = lastActiveDate ? getDateKey(lastActiveDate) : null;

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offset,
      9,
      0,
      0,
      0,
    ));

    if (!suggestedDays.includes(getScheduleDayKey(candidate))) {
      continue;
    }

    if (offset === 0 && lastActiveKey === todayKey) {
      continue;
    }

    return candidate;
  }

  return null;
}

function getStepOpenAction(type: LearningPlanStepType) {
  switch (type) {
    case LearningPlanStepType.VOCABULARY_REVIEW:
      return 'VOCABULARY_TAB';
    case LearningPlanStepType.GRAMMAR_PRACTICE:
    case LearningPlanStepType.CUSTOM_PRACTICE:
      return 'CUSTOM_PRACTICE';
    case LearningPlanStepType.RETRY_SCENE:
    case LearningPlanStepType.SCENE:
    default:
      return 'SCENE_DETAIL';
  }
}

function ensureUserReadyForLearningPlan(user: LearningPlanUserContext) {
  if (!user.onboardingCompletedAt) {
    throw Object.assign(new Error('Người dùng chưa hoàn tất onboarding để tạo learning plan'), {
      code: 'LEARNING_PLAN_NOT_READY',
      status: 409,
    });
  }

  if (!user.level || !user.learningGoal || !user.studyFrequency || !user.selfAssessment) {
    throw Object.assign(new Error('Thiếu dữ liệu học tập để tạo learning plan'), {
      code: 'LEARNING_PLAN_CONTEXT_INCOMPLETE',
      status: 409,
    });
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRoadmapSnapshot(sourceSnapshot: PlanRecord['sourceSnapshot']): RoadmapSnapshot {
  if (!isPlainObject(sourceSnapshot)) return {};
  return sourceSnapshot as RoadmapSnapshot;
}

function buildRoadmapMeta(args: {
  goal: string | null;
  level: Level;
  steps: Array<{ type: LearningPlanStepType }>;
  baselineScores: {
    grammar: number | null;
    vocabulary: number | null;
    naturalness: number | null;
  };
}) {
  const coreSceneCount = args.steps.filter((step) => SCENE_STEP_TYPES.has(step.type)).length;

  return {
    targetOutcome: getTargetOutcome(args.goal, args.level),
    completionCriteria: getCompletionCriteria(args.steps.length, coreSceneCount),
    reward: getRoadmapReward(args.goal, args.level),
    baselineScores: args.baselineScores,
  };
}

function getRoadmapLifecycle(sourceSnapshot: PlanRecord['sourceSnapshot']): RoadmapLifecycle {
  return getRoadmapSnapshot(sourceSnapshot).roadmapLifecycle ?? {};
}

function buildUpdatedSourceSnapshot(
  current: PlanRecord['sourceSnapshot'],
  patch: {
    roadmapMeta?: RoadmapMeta;
    roadmapLifecycle?: RoadmapLifecycle;
  },
) {
  const snapshot = getRoadmapSnapshot(current);

  return {
    ...snapshot,
    ...(patch.roadmapMeta ? { roadmapMeta: patch.roadmapMeta } : {}),
    ...(patch.roadmapLifecycle ? { roadmapLifecycle: patch.roadmapLifecycle } : {}),
  } satisfies RoadmapSnapshot;
}

function getPlanProgressStats(
  plan: PlanRecord,
  completionCriteria: RoadmapMeta['completionCriteria'],
  recentAverageScore: number | null,
) {
  const completedSteps = plan.steps.filter((step) => (
    step.status === LearningPlanStepStatus.COMPLETED || step.completedCount >= step.targetCount
  )).length;
  const completedCoreScenes = plan.steps.filter((step) => (
    SCENE_STEP_TYPES.has(step.type) &&
    (step.status === LearningPlanStepStatus.COMPLETED || step.completedCount >= step.targetCount)
  )).length;
  const meetsScoreRequirement = recentAverageScore !== null &&
    recentAverageScore >= completionCriteria.minimumRecentAverageScore;

  return {
    completedSteps,
    completedCoreScenes,
    meetsScoreRequirement,
    isCompleted:
      completedSteps >= completionCriteria.requiredSteps &&
      completedCoreScenes >= completionCriteria.requiredCoreScenes &&
      meetsScoreRequirement,
  };
}

function getRecentAverageScore(sessions: RoadmapWindowSession[]) {
  return averageOrNull(sessions.slice(0, 3).map((session) => roundAverageScore(session)));
}

function getCompletedSceneTitles(plan: PlanRecord) {
  return plan.steps
    .filter((step) => (
      SCENE_STEP_TYPES.has(step.type) &&
      (step.status === LearningPlanStepStatus.COMPLETED || step.completedCount >= step.targetCount)
    ))
    .map((step) => step.scene?.title ?? step.title)
    .filter((title): title is string => Boolean(title));
}

function getNextRoadmapSuggestion(plan: PlanRecord) {
  const nextFocusSkill = focusToRecommendSkill(plan.focusSkill);
  return {
    title: `${getGoalLabel(plan.learningGoal)} ${nextFocusSkill.toLowerCase()} expansion`,
    level: plan.level,
    focusSkill: nextFocusSkill,
  };
}

function mapScoreDeltaValue(before: number | null, after: number | null) {
  const resolvedAfter = after ?? before ?? 0;
  return {
    before: before ?? resolvedAfter,
    after: resolvedAfter,
  };
}

async function resolveRoadmapMeta(
  userId: string,
  plan: PlanRecord,
) {
  const snapshot = getRoadmapSnapshot(plan.sourceSnapshot);
  if (snapshot.roadmapMeta) {
    return snapshot.roadmapMeta;
  }

  const beforeSessions = await learningPlanRepo.findCompletedSessionsForRoadmapWindow(
    userId,
    { endedBefore: plan.createdAt, take: 3 },
  );

  return buildRoadmapMeta({
    goal: plan.learningGoal,
    level: plan.level,
    steps: plan.steps.map((step) => ({ type: step.type })),
    baselineScores: {
      grammar: averageOrNull(beforeSessions.map((session) => session.grammarScore)),
      vocabulary: averageOrNull(beforeSessions.map((session) => session.vocabularyScore)),
      naturalness: averageOrNull(beforeSessions.map((session) => session.naturalnessScore)),
    },
  });
}

async function buildCompletionSummary(
  userId: string,
  plan: PlanRecord,
  roadmapMeta: RoadmapMeta,
  lifecycle: RoadmapLifecycle,
  recentSessionsAfterPlan: RoadmapWindowSession[],
) {
  const recentAverageScore = getRecentAverageScore(recentSessionsAfterPlan);
  const progress = getPlanProgressStats(plan, roadmapMeta.completionCriteria, recentAverageScore);
  if (!progress.isCompleted && !lifecycle.completedAt) {
    return null;
  }

  const completedAt = lifecycle.completedAt
    ? new Date(lifecycle.completedAt)
    : recentSessionsAfterPlan[0]?.endedAt ??
      plan.steps
        .filter((step) => step.status === LearningPlanStepStatus.COMPLETED)
        .map((step) => step.updatedAt)
        .sort((a, b) => b.getTime() - a.getTime())[0] ??
      new Date();

  const fallbackBeforeSessions = roadmapMeta.baselineScores.grammar === null &&
      roadmapMeta.baselineScores.vocabulary === null &&
      roadmapMeta.baselineScores.naturalness === null
    ? await learningPlanRepo.findCompletedSessionsForRoadmapWindow(
        userId,
        { endedBefore: plan.createdAt, take: 3 },
      )
    : [];

  const beforeScores = {
    grammar: roadmapMeta.baselineScores.grammar ?? averageOrNull(fallbackBeforeSessions.map((session) => session.grammarScore)),
    vocabulary: roadmapMeta.baselineScores.vocabulary ?? averageOrNull(fallbackBeforeSessions.map((session) => session.vocabularyScore)),
    naturalness: roadmapMeta.baselineScores.naturalness ?? averageOrNull(fallbackBeforeSessions.map((session) => session.naturalnessScore)),
  };

  const afterScores = {
    grammar: averageOrNull(recentSessionsAfterPlan.map((session) => session.grammarScore)),
    vocabulary: averageOrNull(recentSessionsAfterPlan.map((session) => session.vocabularyScore)),
    naturalness: averageOrNull(recentSessionsAfterPlan.map((session) => session.naturalnessScore)),
  };

  return {
    planId: plan.id,
    title: plan.title,
    level: plan.level,
    completedAt,
    completedScenes: getCompletedSceneTitles(plan),
    scoreDelta: {
      grammar: mapScoreDeltaValue(beforeScores.grammar, afterScores.grammar),
      vocabulary: mapScoreDeltaValue(beforeScores.vocabulary, afterScores.vocabulary),
      naturalness: mapScoreDeltaValue(beforeScores.naturalness, afterScores.naturalness),
    },
    reward: {
      badgeTitle: roadmapMeta.reward.badgeTitle,
      xpBonus: roadmapMeta.reward.xpBonus,
    },
    nextRoadmap: getNextRoadmapSuggestion(plan),
  };
}

async function maybeMarkPlanCompleted(
  userId: string,
  plan: PlanRecord,
  roadmapMeta: RoadmapMeta,
  lifecycle: RoadmapLifecycle,
  recentSessionsAfterPlan: RoadmapWindowSession[],
) {
  const recentAverageScore = getRecentAverageScore(recentSessionsAfterPlan);
  const progress = getPlanProgressStats(plan, roadmapMeta.completionCriteria, recentAverageScore);
  if (!progress.isCompleted && !lifecycle.completedAt) {
    return plan;
  }

  const completedAt = lifecycle.completedAt
    ? new Date(lifecycle.completedAt)
    : recentSessionsAfterPlan[0]?.endedAt ?? new Date();
  const nextRoadmap = getNextRoadmapSuggestion(plan);
  const nextLifecycle: RoadmapLifecycle = {
    ...lifecycle,
    completedAt: completedAt.toISOString(),
  };

  let updatedPlan = lifecycle.completedAt
    ? plan
    : await learningPlanRepo.updateLearningPlanById(
        plan.id,
        {
          sourceSnapshot: buildUpdatedSourceSnapshot(plan.sourceSnapshot, {
            roadmapMeta,
            roadmapLifecycle: nextLifecycle,
          }) as unknown as Prisma.InputJsonValue,
        },
      );

  const updatedLifecycle = getRoadmapLifecycle(updatedPlan.sourceSnapshot);
  if (!updatedLifecycle.rewardGrantedAt) {
    updatedPlan = await prisma.$transaction(async (tx) => {
      const currentPlan = await learningPlanRepo.findOwnedLearningPlanById(userId, updatedPlan.id, tx);
      if (!currentPlan) {
        throw Object.assign(new Error('Không tìm thấy learning plan để grant reward roadmap'), {
          code: 'LEARNING_PLAN_NOT_FOUND',
          status: 404,
        });
      }

      if (getRoadmapLifecycle(currentPlan.sourceSnapshot).rewardGrantedAt) {
        return currentPlan;
      }

      await usersRepo.updateUserById(userId, {
        totalXp: {
          increment: roadmapMeta.reward.xpBonus,
        },
      }, tx);

      return learningPlanRepo.updateLearningPlanById(
        currentPlan.id,
        {
          sourceSnapshot: buildUpdatedSourceSnapshot(currentPlan.sourceSnapshot, {
            roadmapLifecycle: {
              ...getRoadmapLifecycle(currentPlan.sourceSnapshot),
              rewardGrantedAt: new Date().toISOString(),
            },
          }) as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
  }

  if (!getRoadmapLifecycle(updatedPlan.sourceSnapshot).completionNotificationSentAt) {
    try {
      await notificationsService.createRoadmapCompletedNotification({
        userId,
        planId: updatedPlan.id,
        planTitle: updatedPlan.title,
        reward: roadmapMeta.reward,
        nextRoadmap,
      });

      return learningPlanRepo.updateLearningPlanById(
        updatedPlan.id,
        {
          sourceSnapshot: buildUpdatedSourceSnapshot(updatedPlan.sourceSnapshot, {
            roadmapLifecycle: {
              ...getRoadmapLifecycle(updatedPlan.sourceSnapshot),
              completionNotificationSentAt: new Date().toISOString(),
            },
          }) as unknown as Prisma.InputJsonValue,
        },
      );
    } catch (error: any) {
      console.warn(`[learning-plan] roadmap completed notification failed: ${error?.message ?? error}`);
    }
  }

  return updatedPlan;
}

async function maybeCreateStudyReminder(
  userId: string,
  plan: PlanRecord,
  userContext: Awaited<ReturnType<typeof learningPlanRepo.findUserLearningContext>>,
  lifecycle: RoadmapLifecycle,
  derivedState: RoadmapDerivedState,
) {
  if (!userContext || derivedState === 'COMPLETED') {
    return plan;
  }

  const schedule = {
    suggestedDays: getSuggestedDays(userContext.studyFrequency),
    nextSuggestedAt: buildNextSuggestedAt(
      getSuggestedDays(userContext.studyFrequency),
      userContext.lastActiveDate,
    ),
  };

  if (!schedule.nextSuggestedAt || schedule.nextSuggestedAt > new Date()) {
    return plan;
  }

  const reminderDate = getDateKey(schedule.nextSuggestedAt);
  if (lifecycle.lastReminderDate === reminderDate) {
    return plan;
  }

  try {
    await notificationsService.createStudyReminderNotification({
      userId,
      planId: plan.id,
      planTitle: plan.title,
      nextSuggestedAt: schedule.nextSuggestedAt,
    });

    return learningPlanRepo.updateLearningPlanById(
      plan.id,
      {
        sourceSnapshot: buildUpdatedSourceSnapshot(plan.sourceSnapshot, {
          roadmapLifecycle: {
            ...lifecycle,
            lastReminderDate: reminderDate,
          },
        }) as unknown as Prisma.InputJsonValue,
      },
    );
  } catch (error: any) {
    console.warn(`[learning-plan] study reminder notification failed: ${error?.message ?? error}`);
    return plan;
  }
}

function mapStepMetadata(step: PlanRecord['steps'][number]) {
  const base = isPlainObject(step.metadata) ? step.metadata : {};
  return {
    ...base,
    openAction: getStepOpenAction(step.type),
  };
}

async function buildLearningPlanResponse(
  userId: string,
  plan: PlanRecord,
): Promise<LearningPlanResponse> {
  const userContext = await learningPlanRepo.findUserLearningContext(userId);
  if (!userContext) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const roadmapMeta = await resolveRoadmapMeta(userId, plan);
  const recentSessionsAfterPlan = await learningPlanRepo.findCompletedSessionsForRoadmapWindow(
    userId,
    { endedAfter: plan.createdAt, take: 5 },
  );
  const lifecycle = getRoadmapLifecycle(plan.sourceSnapshot);
  const finalizedPlan = await maybeMarkPlanCompleted(
    userId,
    plan,
    roadmapMeta,
    lifecycle,
    recentSessionsAfterPlan,
  );
  const finalizedLifecycle = getRoadmapLifecycle(finalizedPlan.sourceSnapshot);
  const recentAverageScore = getRecentAverageScore(recentSessionsAfterPlan);
  const progress = getPlanProgressStats(
    finalizedPlan,
    roadmapMeta.completionCriteria,
    recentAverageScore,
  );
  const derivedState: RoadmapDerivedState =
    finalizedLifecycle.completedAt || progress.isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
  const planWithReminder = await maybeCreateStudyReminder(
    userId,
    finalizedPlan,
    userContext,
    finalizedLifecycle,
    derivedState,
  );
  const schedule = {
    suggestedDays: getSuggestedDays(userContext.studyFrequency),
    nextSuggestedAt: buildNextSuggestedAt(
      getSuggestedDays(userContext.studyFrequency),
      userContext.lastActiveDate,
    ),
  };
  const completionSummary = await buildCompletionSummary(
    userId,
    planWithReminder,
    roadmapMeta,
    getRoadmapLifecycle(planWithReminder.sourceSnapshot),
    recentSessionsAfterPlan,
  );

  const nextStep = derivedState === 'COMPLETED'
    ? null
    : planWithReminder.steps.find((step) => (
        step.status === LearningPlanStepStatus.NEXT || step.status === LearningPlanStepStatus.IN_PROGRESS
      )) ?? null;

  return {
    plan: {
      id: planWithReminder.id,
      status: planWithReminder.status,
      derivedState,
      title: planWithReminder.title,
      summary: planWithReminder.summary,
      level: planWithReminder.level,
      learningGoal: planWithReminder.learningGoal,
      studyFrequency: planWithReminder.studyFrequency,
      focusSkill: planWithReminder.focusSkill,
      weeklyTarget: planWithReminder.weeklyTarget,
      generatedBy: planWithReminder.generatedBy,
      sourceSnapshot: planWithReminder.sourceSnapshot,
      targetOutcome: roadmapMeta.targetOutcome,
      completionCriteria: roadmapMeta.completionCriteria,
      reward: roadmapMeta.reward,
      schedule,
      createdAt: planWithReminder.createdAt,
      updatedAt: planWithReminder.updatedAt,
    },
    steps: planWithReminder.steps.map((step) => ({
      id: step.id,
      type: step.type,
      status: step.status,
      focusSkill: step.focusSkill,
      sceneId: step.sceneId,
      title: step.title,
      description: step.description,
      reason: step.reason,
      sortOrder: step.sortOrder,
      targetCount: step.targetCount,
      completedCount: step.completedCount,
      metadata: mapStepMetadata(step),
      scene: step.scene,
    })),
    nextStep: nextStep
      ? {
          id: nextStep.id,
          type: nextStep.type,
          sceneId: nextStep.sceneId,
          title: nextStep.title,
          focusSkill: nextStep.focusSkill,
        }
      : null,
    completionSummary,
  };
}

async function buildPlanSteps(userId: string, focusSkill: LearningFocusSkill) {
  const recommended = await scenesService.recommendScenes(userId, { limit: 5 });
  const scenes = recommended.scenes ?? [];

  return scenes.map((scene, index) => ({
    sceneId: scene.id,
    type: LearningPlanStepType.SCENE,
    status: index === 0 ? LearningPlanStepStatus.NEXT : LearningPlanStepStatus.LOCKED,
    focusSkill,
    title: scene.title,
    description: scene.description,
    reason: getStepReason(focusSkill, (scene as any).matchReason),
    sortOrder: index + 1,
    metadata: {
      retrievalMode: (scene as any).retrievalMode ?? recommended.retrievalMode,
      score: (scene as any).score ?? null,
      similarity: (scene as any).similarity ?? null,
      openAction: getStepOpenAction(LearningPlanStepType.SCENE),
    },
  }));
}

async function appendAdaptiveStepIfNeeded(args: {
  userId: string;
  plan: PlanRecord;
  scores: { grammar: number; vocabulary: number; naturalness: number };
  feedbackItems: Array<{ errorType: ErrorType | null; hasError: boolean }>;
  sceneId?: string | null;
}) {
  const roadmapMeta = await resolveRoadmapMeta(args.userId, args.plan);
  const recentSessionsAfterPlan = await learningPlanRepo.findCompletedSessionsForRoadmapWindow(
    args.userId,
    { endedAfter: args.plan.createdAt, take: 5 },
  );
  const recentAverageScore = getRecentAverageScore(recentSessionsAfterPlan);
  const progress = getPlanProgressStats(args.plan, roadmapMeta.completionCriteria, recentAverageScore);
  const hasNextOrLocked = args.plan.steps.some((step) => (
    step.status === LearningPlanStepStatus.NEXT ||
    step.status === LearningPlanStepStatus.IN_PROGRESS ||
    step.status === LearningPlanStepStatus.LOCKED
  ));

  if (progress.isCompleted || hasNextOrLocked) {
    return args.plan;
  }

  const nextFocus = focusFromScores(args.scores);
  const issueCounts = countIssuesByType(args.feedbackItems);
  const sortOrder = await learningPlanRepo.countPlanSteps(args.plan.id);

  await learningPlanRepo.createLearningPlanStep({
    plan: { connect: { id: args.plan.id } },
    scene: args.sceneId && nextFocus !== LearningFocusSkill.VOCABULARY
      ? { connect: { id: args.sceneId } }
      : undefined,
    type: nextFocus === LearningFocusSkill.VOCABULARY
      ? LearningPlanStepType.VOCABULARY_REVIEW
      : LearningPlanStepType.RETRY_SCENE,
    status: LearningPlanStepStatus.NEXT,
    focusSkill: nextFocus,
    title: nextFocus === LearningFocusSkill.VOCABULARY
      ? 'Review useful phrases from your session'
      : 'Try one more focused practice',
    description: 'Adaptive step generated from your latest session result.',
    reason: `Latest focus: ${nextFocus}. Issues: grammar ${issueCounts.GRAMMAR}, vocabulary ${issueCounts.VOCABULARY}, naturalness ${issueCounts.NATURALNESS}.`,
    sortOrder: sortOrder + 1,
    metadata: {
      ...issueCounts,
      openAction: getStepOpenAction(
        nextFocus === LearningFocusSkill.VOCABULARY
          ? LearningPlanStepType.VOCABULARY_REVIEW
          : LearningPlanStepType.RETRY_SCENE,
      ),
    } as unknown as Prisma.InputJsonValue,
  });

  const refreshedPlan = await learningPlanRepo.findActiveLearningPlan(args.userId);
  return refreshedPlan ?? args.plan;
}

function focusFromScores(scores: { grammar: number; vocabulary: number; naturalness: number }) {
  const entries: Array<[LearningFocusSkill, number]> = [
    [LearningFocusSkill.GRAMMAR, scores.grammar],
    [LearningFocusSkill.VOCABULARY, scores.vocabulary],
    [LearningFocusSkill.NATURALNESS, scores.naturalness],
  ];
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}

function countIssuesByType(feedbackItems: Array<{ errorType: ErrorType | null; hasError: boolean }>) {
  return feedbackItems.reduce(
    (acc, item) => {
      if (item.hasError && item.errorType) acc[item.errorType] += 1;
      return acc;
    },
    {
      [ErrorType.GRAMMAR]: 0,
      [ErrorType.VOCABULARY]: 0,
      [ErrorType.NATURALNESS]: 0,
    },
  );
}

/**
 * Function Objective - getCurrentLearningPlan
 * Summary: Lấy active roadmap, tự tạo nếu user chưa có plan.
 */
export async function getCurrentLearningPlan(userId: string) {
  const existing = await learningPlanRepo.findActiveLearningPlan(userId);
  if (!existing) {
    const user = await learningPlanRepo.findUserLearningContext(userId);
    if (!user) {
      throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    }
    ensureUserReadyForLearningPlan(user);
    return generateLearningPlan(userId, { notify: false });
  }

  return buildLearningPlanResponse(userId, existing);
}

/**
 * Function Objective - getLearningPlanCompletionSummary
 * Summary: Trả completion summary của một roadmap theo plan id.
 */
export async function getLearningPlanCompletionSummary(userId: string, planId: string) {
  const plan = await learningPlanRepo.findOwnedLearningPlanById(userId, planId);
  if (!plan) {
    throw Object.assign(new Error('Không tìm thấy learning plan'), {
      code: 'LEARNING_PLAN_NOT_FOUND',
      status: 404,
    });
  }

  const response = await buildLearningPlanResponse(userId, plan);
  return {
    completionSummary: response.completionSummary,
  };
}

/**
 * Function Objective - generateLearningPlan
 * Summary: Tạo roadmap mới từ onboarding, level, session history, và recommend scenes.
 */
export async function generateLearningPlan(
  userId: string,
  options: {
    notify?: boolean;
    notificationType?: LearningPlanNotificationKind;
    forcedFocusSkill?: LearningFocusSkill;
  } = {},
) {
  const [user, recentSessions] = await Promise.all([
    learningPlanRepo.findUserLearningContext(userId),
    learningPlanRepo.findRecentSessionsForPlan(userId, 5),
  ]);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }
  ensureUserReadyForLearningPlan(user);

  const focusSkill = options.forcedFocusSkill ?? getFocusFromSessions(recentSessions, user.selfAssessment);
  const weeklyTarget = getWeeklyTarget(user.studyFrequency);
  const steps = await buildPlanSteps(userId, focusSkill);
  const roadmapMeta = buildRoadmapMeta({
    goal: user.learningGoal,
    level: user.level,
    steps,
    baselineScores: {
      grammar: averageOrNull(recentSessions.map((session) => session.grammarScore)),
      vocabulary: averageOrNull(recentSessions.map((session) => session.vocabularyScore)),
      naturalness: averageOrNull(recentSessions.map((session) => session.naturalnessScore)),
    },
  });

  const plan = await prisma.$transaction(async (tx) => {
    await learningPlanRepo.archiveActiveLearningPlans(userId, tx);
    return learningPlanRepo.createLearningPlan({
      user: { connect: { id: userId } },
      title: getPlanTitle(user.learningGoal, user.level),
      summary: getPlanSummary({
        goal: user.learningGoal,
        level: user.level,
        focusSkill,
        weeklyTarget,
      }),
      level: user.level,
      learningGoal: user.learningGoal,
      studyFrequency: user.studyFrequency,
      focusSkill,
      weeklyTarget,
      generatedBy: 'RULE',
      sourceSnapshot: {
        selfAssessment: user.selfAssessment,
        recentSessionCount: recentSessions.length,
        roadmapMeta,
        roadmapLifecycle: {
          completedAt: null,
          rewardGrantedAt: null,
          completionNotificationSentAt: null,
          lastReminderDate: null,
          nextRoadmapStartedAt: null,
        },
      } as unknown as Prisma.InputJsonValue,
      steps: {
        create: steps.map((step) => ({
          scene: step.sceneId ? { connect: { id: step.sceneId } } : undefined,
          type: step.type,
          status: step.status,
          focusSkill: step.focusSkill,
          title: step.title,
          description: step.description,
          reason: step.reason,
          sortOrder: step.sortOrder,
          metadata: step.metadata as unknown as Prisma.InputJsonValue,
        })),
      },
    }, tx);
  });

  const response = await buildLearningPlanResponse(userId, plan);

  if (options.notify) {
    await notificationsService.createLearningPlanNotification({
      userId,
      type: options.notificationType ?? NotificationType.LEARNING_PLAN_READY,
      plan: {
        id: response.plan.id,
        title: response.plan.title,
        focusSkill: response.plan.focusSkill,
        weeklyTarget: response.plan.weeklyTarget,
      },
    });
  }

  return response;
}

/**
 * Function Objective - refreshLearningPlan
 * Summary: Archive plan cũ và tạo roadmap mới.
 */
export async function refreshLearningPlan(userId: string) {
  return generateLearningPlan(userId, {
    notify: true,
    notificationType: NotificationType.LEARNING_PLAN_REFRESHED,
  });
}

/**
 * Function Objective - startNextLearningPlan
 * Summary: Chốt roadmap đã completed và tạo roadmap kế tiếp theo focus gợi ý.
 * Inputs: userId và planId của roadmap đã hoàn thành.
 * Behavior: Kiểm tra ownership/completion -> generate roadmap mới theo next focus -> ghi dấu transition để idempotent.
 * Returns: Completion summary của plan cũ và roadmap mới để mobile chuyển màn.
 */
export async function startNextLearningPlan(userId: string, planId: string) {
  const existingPlan = await learningPlanRepo.findOwnedLearningPlanById(userId, planId);
  if (!existingPlan) {
    throw Object.assign(new Error('Không tìm thấy learning plan'), {
      code: 'LEARNING_PLAN_NOT_FOUND',
      status: 404,
    });
  }

  const previousPlan = await buildLearningPlanResponse(userId, existingPlan);
  if (!previousPlan.completionSummary) {
    throw Object.assign(new Error('Roadmap hiện tại chưa hoàn thành để chuyển sang bước tiếp theo'), {
      code: 'LEARNING_PLAN_NOT_COMPLETED',
      status: 409,
    });
  }

  const latestPlan = await learningPlanRepo.findOwnedLearningPlanById(userId, planId);
  if (!latestPlan) {
    throw Object.assign(new Error('Không tìm thấy learning plan sau khi đồng bộ completion'), {
      code: 'LEARNING_PLAN_NOT_FOUND',
      status: 404,
    });
  }

  const latestLifecycle = getRoadmapLifecycle(latestPlan.sourceSnapshot);
  if (latestLifecycle.nextRoadmapStartedAt) {
    const activePlan = await learningPlanRepo.findActiveLearningPlan(userId);
    if (activePlan && activePlan.id !== planId) {
      return {
        previousPlanId: planId,
        completionSummary: previousPlan.completionSummary,
        nextPlan: await buildLearningPlanResponse(userId, activePlan),
      };
    }
  }

  const nextPlan = await generateLearningPlan(userId, {
    notify: true,
    notificationType: NotificationType.LEARNING_PLAN_REFRESHED,
    forcedFocusSkill: previousPlan.completionSummary.nextRoadmap.focusSkill,
  });

  await learningPlanRepo.updateLearningPlanById(planId, {
    sourceSnapshot: buildUpdatedSourceSnapshot(latestPlan.sourceSnapshot, {
      roadmapLifecycle: {
        ...latestLifecycle,
        nextRoadmapStartedAt: new Date().toISOString(),
      },
    }) as unknown as Prisma.InputJsonValue,
  });

  return {
    previousPlanId: planId,
    completionSummary: previousPlan.completionSummary,
    nextPlan,
  };
}

/**
 * Function Objective - completeLearningPlanStep
 * Summary: Đánh dấu một roadmap step hoàn thành và đồng bộ next step.
 */
export async function completeLearningPlanStep(userId: string, params: CompleteLearningPlanStepParams) {
  const step = await learningPlanRepo.findOwnedStep(userId, params.id);
  if (!step) {
    throw Object.assign(new Error('Không tìm thấy learning plan step'), {
      code: 'LEARNING_PLAN_STEP_NOT_FOUND',
      status: 404,
    });
  }

  await prisma.$transaction(async (tx) => {
    await learningPlanRepo.updateStepStatus(step.id, {
      status: LearningPlanStepStatus.COMPLETED,
      completedCount: Math.max(step.targetCount, step.completedCount + 1),
    }, tx);

    const activeNext = await learningPlanRepo.findNextPlanStep(step.planId, tx);
    if (!activeNext) {
      await learningPlanRepo.promoteNextLockedStep(step.planId, tx);
    }
  });

  const plan = await learningPlanRepo.findActiveLearningPlan(userId);
  return plan ? buildLearningPlanResponse(userId, plan) : null;
}

/**
 * Function Objective - updatePlanAfterSessionComplete
 * Summary: Cập nhật roadmap sau khi session complete nhưng không chặn flow session result.
 */
export async function updatePlanAfterSessionComplete(userId: string, input: {
  sceneId?: string | null;
  scores: { grammar: number; vocabulary: number; naturalness: number };
  feedbackItems: Array<{ errorType: ErrorType | null; hasError: boolean }>;
}) {
  try {
    const plan = await learningPlanRepo.findActiveLearningPlan(userId);
    if (!plan) {
      await generateLearningPlan(userId);
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (input.sceneId) {
        const matchingStep = await learningPlanRepo.findStepByPlanAndScene(plan.id, input.sceneId, tx);
        if (matchingStep) {
          const nextCompletedCount = Math.max(
            matchingStep.targetCount,
            matchingStep.completedCount + 1,
          );
          await learningPlanRepo.updateStepStatus(matchingStep.id, {
            status: LearningPlanStepStatus.COMPLETED,
            completedCount: nextCompletedCount,
          }, tx);
        }
      }

      const activeNext = await learningPlanRepo.findNextPlanStep(plan.id, tx);
      if (!activeNext) {
        await learningPlanRepo.promoteNextLockedStep(plan.id, tx);
      }
    });

    const refreshedPlan = await learningPlanRepo.findActiveLearningPlan(userId);
    if (!refreshedPlan) return;

    const adaptivePlan = await appendAdaptiveStepIfNeeded({
      userId,
      plan: refreshedPlan,
      scores: input.scores,
      feedbackItems: input.feedbackItems,
      sceneId: input.sceneId,
    });

    await buildLearningPlanResponse(userId, adaptivePlan);
  } catch (error: any) {
    console.warn(`[learning-plan] update after session failed: ${error?.message ?? error}`);
  }
}

export async function generateLearningPlanBestEffort(
  userId: string,
  options: {
    notify?: boolean;
    notificationType?: LearningPlanNotificationKind;
    forcedFocusSkill?: LearningFocusSkill;
  } = {},
) {
  try {
    return await generateLearningPlan(userId, options);
  } catch (error: any) {
    console.warn(`[learning-plan] best-effort generation failed for ${userId}: ${error?.message ?? error}`);
    return null;
  }
}
