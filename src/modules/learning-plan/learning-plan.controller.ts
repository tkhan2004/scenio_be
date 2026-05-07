import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { CompleteLearningPlanStepParams } from '../../schemas/learning-plan';
import * as learningPlanService from './learning-plan.service';

export const getCurrentLearningPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id as string;
    const result = await learningPlanService.getCurrentLearningPlan(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

export const generateLearningPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id as string;
    const result = await learningPlanService.generateLearningPlan(userId);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const refreshLearningPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id as string;
    const result = await learningPlanService.refreshLearningPlan(userId);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

export const completeLearningPlanStep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id as string;
    const params = (req as any).validatedParams as CompleteLearningPlanStepParams;
    const result = await learningPlanService.completeLearningPlanStep(userId, params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

