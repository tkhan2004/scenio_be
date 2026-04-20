import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { GetVoiceParams, ListVoicesQuery, PreviewVoiceInput } from '../../schemas/voices';
import * as voicesService from './voices.service';

/**
 * HTTP Handler - listVoices
 * Summary: Trả về voice catalog có filter và phân trang.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedQuery -> gọi service -> trả response chuẩn.
 */
export const listVoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req as any).validatedQuery as ListVoicesQuery;
    const result = await voicesService.listVoices(query);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - getVoice
 * Summary: Lấy chi tiết một voice profile.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedParams -> gọi service -> trả response chuẩn.
 */
export const getVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = (req as any).validatedParams as GetVoiceParams;
    const result = await voicesService.getVoiceById(params);
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * HTTP Handler - previewVoice
 * Summary: Sinh audio preview cho voice profile và stream binary về client.
 * Inputs: req, res, next.
 * Behavior: Lấy validatedBody -> gọi service -> set audio headers -> send binary.
 */
export const previewVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = (req as any).validatedBody as PreviewVoiceInput;
    const result = await voicesService.previewVoice(input);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('X-Voice-Id', result.voice.id);
    res.setHeader('X-Voice-Provider', result.provider);
    res.setHeader('X-Voice-Display-Name', result.voice.displayName);
    res.status(200).send(result.audio);
  } catch (error) {
    next(error);
  }
};
