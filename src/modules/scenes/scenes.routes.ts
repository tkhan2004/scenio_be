import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as scenesController from './scenes.controller';
import { listScenesSchema, searchScenesSchema } from '../../schemas/scenes';

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

export default router;
