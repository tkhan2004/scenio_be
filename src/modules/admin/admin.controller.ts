import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import {
  CreateAdminMissionInput,
  CreateAdminSceneInput,
  GetAdminUserDetailParams,
  GetAdminUserSessionsParams,
  GetAdminUserSessionsQuery,
  GetAdminSceneParams,
  GetAllUsersQuery,
  ListAdminScenesQuery,
  ToggleAdminBadgeInput,
  ToggleAdminBadgeParams,
  ToggleAdminMissionInput,
  ToggleAdminMissionParams,
  ToggleAdminSceneInput,
  ToggleAdminSceneParams,
  ToggleAdminVoiceInput,
  ToggleAdminVoiceParams,
  UpdateAdminMissionInput,
  UpdateAdminMissionParams,
  UpdateAdminSceneInput,
  UpdateAdminSceneParams,
} from '../../schemas/admin';
import * as adminService from './admin.service';

/**
 * HTTP Handler - getAllUsers
 * Summary: Trả về danh sách learner cho admin dashboard.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedQuery -> gọi service -> trả response chuẩn.
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req as any).validatedQuery as GetAllUsersQuery;
    const result = await adminService.getAllUsers(query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getUserDetail
 * Summary: Trả về chi tiết learner cho admin drawer profile tab.
 * Inputs: params.id.
 * Behavior: Get validatedParams -> call service -> return response.
 */
export const getUserDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as GetAdminUserDetailParams;
    const result = await adminService.getUserDetail(params.id);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getUserSessions
 * Summary: Trả về lịch sử session của learner trong admin drawer.
 * Inputs: params.id và query page/limit.
 * Behavior: Get validatedParams/query -> call service -> return response.
 */
export const getUserSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as GetAdminUserSessionsParams;
    const query = (req as any).validatedQuery as GetAdminUserSessionsQuery;
    const result = await adminService.getUserSessions(params.id, query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getOverview
 * Summary: Trả về dữ liệu overview cho admin dashboard.
 * Inputs: req, res, next.
 * Behavior: Gọi service overview -> trả response chuẩn.
 */
export const getOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.getOverview();
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - listScenes
 * Summary: Trả về scene list cho admin scene table.
 * Inputs: query filter và phân trang đã qua validation.
 * Behavior: Get validatedQuery -> call service -> return response.
 */
export const listScenes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req as any).validatedQuery as ListAdminScenesQuery;
    const result = await adminService.listScenes(query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getSceneById
 * Summary: Trả về chi tiết scene cho admin drawer edit.
 * Inputs: params.id.
 * Behavior: Get validatedParams -> call service -> return detail response.
 */
export const getSceneById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as GetAdminSceneParams;
    const result = await adminService.getSceneById(params.id);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - createScene
 * Summary: Tạo scene mới từ admin form.
 * Inputs: validatedBody create scene.
 * Behavior: Get body -> call service -> return 201 response.
 */
export const createScene = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as CreateAdminSceneInput;
    const result = await adminService.createScene(input);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - updateScene
 * Summary: Cập nhật scene hiện có từ admin form.
 * Inputs: params.id và validatedBody patch scene.
 * Behavior: Get params/body -> call service -> return response chuẩn.
 */
export const updateScene = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as UpdateAdminSceneParams;
    const input = (req as any).validatedBody as UpdateAdminSceneInput;
    const result = await adminService.updateScene(params.id, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - toggleScene
 * Summary: Bật hoặc tắt trạng thái active của scene.
 * Inputs: params.id và body.isActive.
 * Behavior: Get params/body -> call service -> return minimal row payload.
 */
export const toggleScene = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as ToggleAdminSceneParams;
    const input = (req as any).validatedBody as ToggleAdminSceneInput;
    const result = await adminService.toggleScene(params.id, input.isActive);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - listMissions
 * Summary: Trả về danh sách mission template cho admin mission table.
 * Inputs: req, res, next.
 * Behavior: Call service -> return response chuẩn.
 */
export const listMissions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.listMissions();
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - createMission
 * Summary: Tạo mission template mới.
 * Inputs: validatedBody create mission.
 * Behavior: Get body -> call service -> return 201 response.
 */
export const createMission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as CreateAdminMissionInput;
    const result = await adminService.createMission(input);
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - updateMission
 * Summary: Cập nhật mission template hiện có.
 * Inputs: params.id và validatedBody patch mission.
 * Behavior: Get params/body -> call service -> return response.
 */
export const updateMission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as UpdateAdminMissionParams;
    const input = (req as any).validatedBody as UpdateAdminMissionInput;
    const result = await adminService.updateMission(params.id, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - toggleMission
 * Summary: Bật hoặc tắt trạng thái active của mission template.
 * Inputs: params.id và body.isActive.
 * Behavior: Get params/body -> call service -> return minimal payload.
 */
export const toggleMission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as ToggleAdminMissionParams;
    const input = (req as any).validatedBody as ToggleAdminMissionInput;
    const result = await adminService.toggleMission(params.id, input.isActive);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - listBadges
 * Summary: Trả về danh sách badge cho admin badge table.
 * Inputs: req, res, next.
 * Behavior: Call service -> return response chuẩn.
 */
export const listBadges = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.listBadges();
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - toggleBadge
 * Summary: Bật hoặc tắt trạng thái active của badge.
 * Inputs: params.id và body.isActive.
 * Behavior: Get params/body -> call service -> return minimal payload.
 */
export const toggleBadge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as ToggleAdminBadgeParams;
    const input = (req as any).validatedBody as ToggleAdminBadgeInput;
    const result = await adminService.toggleBadge(params.id, input.isActive);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - listVoices
 * Summary: Trả về voice catalog cho admin voice table.
 * Inputs: req, res, next.
 * Behavior: Call service -> return response chuẩn.
 */
export const listVoices = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.listVoices();
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - toggleVoice
 * Summary: Bật hoặc tắt trạng thái active của voice profile.
 * Inputs: params.id và body.isActive.
 * Behavior: Get params/body -> call service -> return minimal payload.
 */
export const toggleVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as ToggleAdminVoiceParams;
    const input = (req as any).validatedBody as ToggleAdminVoiceInput;
    const result = await adminService.toggleVoice(params.id, input.isActive);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};
