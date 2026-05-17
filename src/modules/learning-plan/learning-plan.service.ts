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
import * as learningPlanRepo from './learning-plan.repository';

type PlanRecord = learningPlanRepo.LearningPlanRecord;
type RecentPlanSession = Awaited<ReturnType<typeof learningPlanRepo.findRecentSessionsForPlan>>[number];
type LearningPlanNotificationKind = 'LEARNING_PLAN_READY' | 'LEARNING_PLAN_REFRESHED';

const STUDY_FREQUENCY_WEEKLY_TARGET: Record<string, number> = {
  LIGHT: 2,
  REGULAR: 3,
  INTENSIVE: 5,
};

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
  return focus === LearningFocusSkill.CONFIDENCE ? LearningFocusSkill.NATURALNESS : focus;
}

function getPlanTitle(goal: string | null, level: Level) {
  const goalLabel = {
    WORK: 'Work English',
    TRAVEL: 'Travel English',
    DAILY: 'Daily English',
    ALL: 'Everyday English',
  }[goal ?? 'ALL'] ?? 'Everyday English';

  return `${goalLabel} ${level} Roadmap`;
}

function getPlanSummary(args: {
  goal: string | null;
  level: Level;
  focusSkill: LearningFocusSkill;
  weeklyTarget: number;
}) {
  return `Lộ trình ${args.weeklyTarget} buổi/tuần cho trình độ ${args.level}, ưu tiên ${args.focusSkill.toLowerCase()} theo mục tiêu ${args.goal || 'GENERAL_ENGLISH'}.`;
}

function getStepReason(focusSkill: LearningFocusSkill, fallbackReason?: string | null) {
  if (fallbackReason) return fallbackReason;
  if (focusSkill === LearningFocusSkill.GRAMMAR) return 'Practice clearer sentence structure and question forms.';
  if (focusSkill === LearningFocusSkill.VOCABULARY) return 'Review useful words and phrases in context.';
  if (focusSkill === LearningFocusSkill.CONFIDENCE) return 'Build confidence with short, repeatable speaking turns.';
  return 'Improve natural conversation flow and polite responses.';
}

function mapPlan(plan: PlanRecord) {
  const nextStep = plan.steps.find((step) => (
    step.status === LearningPlanStepStatus.NEXT || step.status === LearningPlanStepStatus.IN_PROGRESS
  )) ?? null;

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      summary: plan.summary,
      status: plan.status,
      level: plan.level,
      learningGoal: plan.learningGoal,
      studyFrequency: plan.studyFrequency,
      focusSkill: plan.focusSkill,
      weeklyTarget: plan.weeklyTarget,
      generatedBy: plan.generatedBy,
      sourceSnapshot: plan.sourceSnapshot,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
    steps: plan.steps.map((step) => ({
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
      metadata: step.metadata,
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
    },
  }));
}

/**
 * Function Objective - getCurrentLearningPlan
 * Summary: Lấy active plan, tự tạo rule-based plan nếu user chưa có.
 */
export async function getCurrentLearningPlan(userId: string) {
  const existing = await learningPlanRepo.findActiveLearningPlan(userId);
  if (existing) return mapPlan(existing);

  return generateLearningPlan(userId, { notify: false });
}

/**
 * Function Objective - generateLearningPlan
 * Summary: Tạo active learning plan từ onboarding, level, session history, và recommend scenes.
 */
export async function generateLearningPlan(
  userId: string,
  options: {
    notify?: boolean;
    notificationType?: LearningPlanNotificationKind;
  } = {},
) {
  const [user, recentSessions] = await Promise.all([
    learningPlanRepo.findUserLearningContext(userId),
    learningPlanRepo.findRecentSessionsForPlan(userId, 5),
  ]);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const focusSkill = getFocusFromSessions(recentSessions, user.selfAssessment);
  const weeklyTarget = getWeeklyTarget(user.studyFrequency);
  const steps = await buildPlanSteps(userId, focusSkill);

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
      },
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
          metadata: step.metadata,
        })),
      },
    }, tx);
  });

  const mappedPlan = mapPlan(plan);

  if (options.notify) {
    await notificationsService.createLearningPlanNotification({
      userId,
      type: options.notificationType ?? NotificationType.LEARNING_PLAN_READY,
      plan: {
        id: mappedPlan.plan.id,
        title: mappedPlan.plan.title,
        focusSkill: mappedPlan.plan.focusSkill,
        weeklyTarget: mappedPlan.plan.weeklyTarget,
      },
    });
  }

  return mappedPlan;
}

export async function refreshLearningPlan(userId: string) {
  return generateLearningPlan(userId, {
    notify: true,
    notificationType: NotificationType.LEARNING_PLAN_REFRESHED,
  });
}

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
  return plan ? mapPlan(plan) : null;
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
 * Function Objective - updatePlanAfterSessionComplete
 * Summary: Cập nhật active plan sau session complete nhưng không chặn reward/evaluator flow.
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

    const nextFocus = focusFromScores(input.scores);
    const issueCounts = countIssuesByType(input.feedbackItems);

    await prisma.$transaction(async (tx) => {
      if (input.sceneId) {
        const matchingStep = await learningPlanRepo.findStepByPlanAndScene(plan.id, input.sceneId, tx);
        if (matchingStep) {
          await learningPlanRepo.updateStepStatus(matchingStep.id, {
            status: LearningPlanStepStatus.COMPLETED,
            completedCount: { increment: 1 },
          }, tx);
        }
      }

      const activeNext = await learningPlanRepo.findNextPlanStep(plan.id, tx);
      if (!activeNext) {
        const promoted = await learningPlanRepo.promoteNextLockedStep(plan.id, tx);
        if (!promoted) {
          const sortOrder = await learningPlanRepo.countPlanSteps(plan.id, tx);
          await learningPlanRepo.createLearningPlanStep({
            plan: { connect: { id: plan.id } },
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
            metadata: issueCounts as unknown as Prisma.InputJsonValue,
          }, tx);
        }
      }
    });
  } catch (error: any) {
    console.warn(`[learning-plan] update after session failed: ${error?.message ?? error}`);
  }
}

export async function generateLearningPlanBestEffort(
  userId: string,
  options: {
    notify?: boolean;
    notificationType?: LearningPlanNotificationKind;
  } = {},
) {
  try {
    return await generateLearningPlan(userId, options);
  } catch (error: any) {
    console.warn(`[learning-plan] best-effort generation failed for ${userId}: ${error?.message ?? error}`);
    return null;
  }
}
