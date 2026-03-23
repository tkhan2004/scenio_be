import { Response } from 'express';

export const ok = <T>(res: Response, data: T, status: number = 200) => {
  return res.status(status).json({ success: true, data });
};

export const fail = (
  res: Response,
  message: string,
  code: string = 'ERROR',
  status: number = 400,
  details: any = null
) => {
  const response: any = { success: false, error: { code, message } };
  if (details) {
    response.error.details = details;
  }
  return res.status(status).json(response);
};
