import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as scenesController from './scenes.controller';
import {
  getSceneSchema,
  getSceneVoicesSchema,
  listScenesSchema,
  recommendScenesSchema,
  searchScenesSchema,
} from '../../schemas/scenes';

const router = Router();

/**
 * @route   GET /api/scenes
 * @desc    Lấy danh sách kịch bản có filter và phân trang
 */
router.get('/', auth, validate(listScenesSchema), scenesController.listScenes);

/**
 * @route   GET /api/scenes/search
 * @desc    Tìm kiếm kịch bản theo từ khóa
 */
router.get('/search', auth, validate(searchScenesSchema), scenesController.searchScenes);

/**
 * @route   GET /api/scenes/recommend
 * @desc    Gợi ý kịch bản theo điểm yếu hiện tại của user
 */
router.get('/recommend', auth, validate(recommendScenesSchema), scenesController.recommendScenes);

/**
 * @route   GET /api/scenes/:id/voices
 * @desc    Lấy quick-pick voices và advanced voice catalog cho scene
 */
router.get('/:id/voices', auth, validate(getSceneVoicesSchema), scenesController.getSceneVoices);

/**
 * @route   GET /api/scenes/:id
 * @desc    Lấy chi tiết đầy đủ của một kịch bản active
 */
router.get('/:id', auth, validate(getSceneSchema), scenesController.getScene);

export default router;
