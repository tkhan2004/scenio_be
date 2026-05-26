import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  chatProxySchema,
  elevenlabsConfigSchema,
  elevenlabsSpeechSchema,
} from '../../schemas/lab';
import {
  chatProxyController,
  elevenlabsConfigController,
  elevenlabsSpeechController,
} from './lab.controller';

const router = Router();

/**
 * @route   POST /api/lab/chat-proxy
 * @desc    Proxy dev-only tới provider OpenAI-compatible cho static voice lab
 */
router.post('/chat-proxy', auth, validate(chatProxySchema), chatProxyController);
router.get('/elevenlabs-config', auth, validate(elevenlabsConfigSchema), elevenlabsConfigController);
router.post('/elevenlabs-speech', auth, validate(elevenlabsSpeechSchema), elevenlabsSpeechController);

export default router;
