import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { adminAuth } from '../../middleware/adminAuth';
import { validate } from '../../middleware/validate';
import * as adminController from './admin.controller';
import {
  benchmarkAiModelSchema,
  connectAiModelSchema,
  createAdminMissionSchema,
  createAdminSceneSchema,
  getAdminSceneSchema,
  getAdminUserDetailSchema,
  getAdminUserSessionsSchema,
  getAllUsersSchema,
  getOverviewSchema,
  listAiModelsSchema,
  listAdminBadgesSchema,
  listAdminMissionsSchema,
  listAdminScenesSchema,
  listAdminVoicesSchema,
  toggleAdminBadgeSchema,
  toggleAdminMissionSchema,
  toggleAdminSceneSchema,
  toggleAdminVoiceSchema,
  updateAdminMissionSchema,
  updateAdminSceneSchema,
} from '../../schemas/admin';

const router = Router();

router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/ai-models
 * @desc    Lấy AI model catalog và active setting theo feature
 */
router.get('/ai-models', validate(listAiModelsSchema), adminController.listAiModels);

/**
 * @route   POST /api/admin/ai-models/:id/benchmark
 * @desc    Benchmark model để so sánh latency và output
 */
router.post('/ai-models/:id/benchmark', validate(benchmarkAiModelSchema), adminController.benchmarkAiModel);

/**
 * @route   PATCH /api/admin/ai-models/:id/connect
 * @desc    Connect và chọn model làm active cho feature tương ứng
 */
router.patch('/ai-models/:id/connect', validate(connectAiModelSchema), adminController.connectAiModel);

/**
 * @route   GET /api/admin/overview
 * @desc    Lấy KPI và chart data cho admin dashboard
 */
router.get('/overview', validate(getOverviewSchema), adminController.getOverview);

/**
 * @route   GET /api/admin/users
 * @desc    Lấy danh sách learner cho admin dashboard
 */
router.get('/users', validate(getAllUsersSchema), adminController.getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Lấy chi tiết learner cho admin drawer
 */
router.get('/users/:id', validate(getAdminUserDetailSchema), adminController.getUserDetail);

/**
 * @route   GET /api/admin/users/:id/sessions
 * @desc    Lấy lịch sử session của learner cho admin drawer
 */
router.get('/users/:id/sessions', validate(getAdminUserSessionsSchema), adminController.getUserSessions);

/**
 * @route   GET /api/admin/scenes
 * @desc    Lấy danh sách scene cho admin scene table
 */
router.get('/scenes', validate(listAdminScenesSchema), adminController.listScenes);

/**
 * @route   POST /api/admin/scenes
 * @desc    Tạo scene mới từ admin form
 */
router.post('/scenes', validate(createAdminSceneSchema), adminController.createScene);

/**
 * @route   PATCH /api/admin/scenes/:id/toggle
 * @desc    Bật hoặc tắt trạng thái active của scene
 */
router.patch('/scenes/:id/toggle', validate(toggleAdminSceneSchema), adminController.toggleScene);

/**
 * @route   GET /api/admin/scenes/:id
 * @desc    Lấy chi tiết một scene để edit trong admin drawer
 */
router.get('/scenes/:id', validate(getAdminSceneSchema), adminController.getSceneById);

/**
 * @route   PATCH /api/admin/scenes/:id
 * @desc    Cập nhật scene hiện có từ admin form
 */
router.patch('/scenes/:id', validate(updateAdminSceneSchema), adminController.updateScene);

/**
 * @route   GET /api/admin/missions
 * @desc    Lấy danh sách mission template cho admin
 */
router.get('/missions', validate(listAdminMissionsSchema), adminController.listMissions);

/**
 * @route   POST /api/admin/missions
 * @desc    Tạo mission template mới
 */
router.post('/missions', validate(createAdminMissionSchema), adminController.createMission);

/**
 * @route   PATCH /api/admin/missions/:id
 * @desc    Cập nhật mission template hiện có
 */
router.patch('/missions/:id', validate(updateAdminMissionSchema), adminController.updateMission);

/**
 * @route   PATCH /api/admin/missions/:id/toggle
 * @desc    Bật hoặc tắt trạng thái active của mission template
 */
router.patch('/missions/:id/toggle', validate(toggleAdminMissionSchema), adminController.toggleMission);

/**
 * @route   GET /api/admin/badges
 * @desc    Lấy danh sách badge cho admin badge table
 */
router.get('/badges', validate(listAdminBadgesSchema), adminController.listBadges);

/**
 * @route   PATCH /api/admin/badges/:id/toggle
 * @desc    Bật hoặc tắt trạng thái active của badge
 */
router.patch('/badges/:id/toggle', validate(toggleAdminBadgeSchema), adminController.toggleBadge);

/**
 * @route   GET /api/admin/voices
 * @desc    Lấy voice catalog cho admin voice table
 */
router.get('/voices', validate(listAdminVoicesSchema), adminController.listVoices);

/**
 * @route   PATCH /api/admin/voices/:id/toggle
 * @desc    Bật hoặc tắt trạng thái active của voice profile
 */
router.patch('/voices/:id/toggle', validate(toggleAdminVoiceSchema), adminController.toggleVoice);

export default router;
