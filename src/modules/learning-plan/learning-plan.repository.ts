import { LearningPlanStepStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

const learningPlanSelect = {
  id: true,
  userId: true,
  status: true,
  title: true,
  summary: true,
  level: true,
  learningGoal: true,
  studyFrequency: true,
  focusSkill: true,
  weeklyTarget: true,
  generatedBy: true,
  sourceSnapshot: true,
  createdAt: true,
  updatedAt: true,
  steps: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      sceneId: true,
      type: true,
      status: true,
      focusSkill: true,
      title: true,
      description: true,
      reason: true,
      sortOrder: true,
      targetCount: true,
      completedCount: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      scene: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          estimatedMinutes: true,
          characterName: true,
          characterRole: true,
        },
      },
    },
  },
} satisfies Prisma.LearningPlanSelect;

export type LearningPlanRecord = Prisma.LearningPlanGetPayload<{ select: typeof learningPlanSelect }>;

export async function findUserLearningContext(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      level: true,
      learningGoal: true,
      studyFrequency: true,
      selfAssessment: true,
      lastActiveDate: true,
      onboardingCompletedAt: true,
    },
  });
}

export async function findRecentSessionsForPlan(userId: string, take: number) {
  return prisma.session.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    orderBy: { endedAt: 'desc' },
    take,
    select: {
      id: true,
      sceneId: true,
      grammarScore: true,
      vocabularyScore: true,
      naturalnessScore: true,
      messages: {
        where: {
          role: 'USER',
          isFinal: true,
        },
        select: {
          errorType: true,
          feedbackDetails: true,
        },
      },
    },
  });
}

export async function findActiveLearningPlan(userId: string, db: DbClient = prisma) {
  return db.learningPlan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
    select: learningPlanSelect,
  });
}

export async function findOwnedLearningPlanById(userId: string, planId: string, db: DbClient = prisma) {
  return db.learningPlan.findFirst({
    where: {
      id: planId,
      userId,
    },
    select: learningPlanSelect,
  });
}

export async function archiveActiveLearningPlans(userId: string, db: DbClient = prisma) {
  return db.learningPlan.updateMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    data: {
      status: 'ARCHIVED',
    },
  });
}

export async function createLearningPlan(input: Prisma.LearningPlanCreateInput, db: DbClient = prisma) {
  return db.learningPlan.create({
    data: input,
    select: learningPlanSelect,
  });
}

export async function updateLearningPlanById(
  planId: string,
  data: Prisma.LearningPlanUpdateInput,
  db: DbClient = prisma,
) {
  return db.learningPlan.update({
    where: { id: planId },
    data,
    select: learningPlanSelect,
  });
}

export async function findOwnedStep(userId: string, stepId: string, db: DbClient = prisma) {
  return db.learningPlanStep.findFirst({
    where: {
      id: stepId,
      plan: { userId },
    },
    select: {
      id: true,
      planId: true,
      sceneId: true,
      status: true,
      completedCount: true,
      targetCount: true,
      sortOrder: true,
    },
  });
}

export async function updateStepStatus(stepId: string, data: Prisma.LearningPlanStepUpdateInput, db: DbClient = prisma) {
  return db.learningPlanStep.update({
    where: { id: stepId },
    data,
  });
}

export async function findNextPlanStep(planId: string, db: DbClient = prisma) {
  return db.learningPlanStep.findFirst({
    where: {
      planId,
      status: { in: [LearningPlanStepStatus.NEXT, LearningPlanStepStatus.IN_PROGRESS] },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function promoteNextLockedStep(planId: string, db: DbClient = prisma) {
  const nextLocked = await db.learningPlanStep.findFirst({
    where: {
      planId,
      status: LearningPlanStepStatus.LOCKED,
    },
    orderBy: { sortOrder: 'asc' },
  });

  if (!nextLocked) return null;

  return db.learningPlanStep.update({
    where: { id: nextLocked.id },
    data: { status: LearningPlanStepStatus.NEXT },
  });
}

export async function findStepByPlanAndScene(planId: string, sceneId: string, db: DbClient = prisma) {
  return db.learningPlanStep.findFirst({
    where: {
      planId,
      sceneId,
      type: { in: ['SCENE', 'RETRY_SCENE'] },
      status: { notIn: ['COMPLETED', 'SKIPPED'] },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createLearningPlanStep(input: Prisma.LearningPlanStepCreateInput, db: DbClient = prisma) {
  return db.learningPlanStep.create({
    data: input,
  });
}

export async function countPlanSteps(planId: string, db: DbClient = prisma) {
  return db.learningPlanStep.count({
    where: { planId },
  });
}

export async function findCompletedSessionsForRoadmapWindow(
  userId: string,
  args: {
    endedAfter?: Date;
    endedBefore?: Date;
    take?: number;
  } = {},
  db: DbClient = prisma,
) {
  return db.session.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      endedAt: {
        ...(args.endedAfter ? { gte: args.endedAfter } : {}),
        ...(args.endedBefore ? { lt: args.endedBefore } : {}),
      },
    },
    orderBy: { endedAt: 'desc' },
    take: args.take,
    select: {
      id: true,
      sceneId: true,
      endedAt: true,
      grammarScore: true,
      vocabularyScore: true,
      naturalnessScore: true,
      scene: {
        select: {
          id: true,
          title: true,
        },
      },
      customPracticeConfig: {
        select: {
          id: true,
          displayTitle: true,
        },
      },
    },
  });
}
