import { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../utils/response';
import { ChatProxyInput, ElevenLabsSpeechInput } from '../../schemas/lab';
import * as labService from './lab.service';

/**
 * HTTP Handler - chatProxyController
 * Summary: Proxy request từ page lab tới provider LLM OpenAI-compatible.
 * Inputs: req, res, next.
 * Behavior: Lấy userId + validatedBody -> gọi service -> trả reply cho UI static.
 */
export const chatProxyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as ChatProxyInput;
    const result = await labService.proxyChatCompletion(userId, input);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - elevenlabsConfigController
 * Summary: Tra ve config/preset voice de static lab render voice selector.
 */
export const elevenlabsConfigController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const result = labService.getElevenLabsLabConfig();
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - elevenlabsSpeechController
 * Summary: Sinh audio ElevenLabs theo voice duoc chon va stream binary ve browser.
 */
export const elevenlabsSpeechController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, 'Thiếu thông tin người dùng', 'UNAUTHORIZED', 401);
    }

    const input = (req as any).validatedBody as ElevenLabsSpeechInput;
    const result = await labService.synthesizeElevenLabsSpeech(input);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('X-Voice-Id', result.voiceId);
    res.setHeader('X-Model-Id', result.modelId);
    res.status(200).send(result.audio);
  } catch (error) {
    next(error);
  }
};
