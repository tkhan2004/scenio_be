import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as voicesController from './voices.controller';
import { getVoiceSchema, listVoicesSchema, previewVoiceSchema } from '../../schemas/voices';

const router = Router();

/**
 * @route   GET /api/voices
 * @desc    Lấy voice catalog active có filter và phân trang
 */
router.get('/', auth, validate(listVoicesSchema), voicesController.listVoices);

/**
 * @route   POST /api/voices/preview
 * @desc    Sinh audio preview cho voice profile được chọn
 */
router.post('/preview', auth, validate(previewVoiceSchema), voicesController.previewVoice);

/**
 * @route   GET /api/voices/:id
 * @desc    Lấy chi tiết một voice profile active
 */
router.get('/:id', auth, validate(getVoiceSchema), voicesController.getVoice);

export default router;
