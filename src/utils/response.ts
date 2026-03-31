import { Response } from 'express';

/**
 * Định dạng phản hồi thành công (2xx)
 */
export const ok = <T>(res: Response, data: T, status: number = 200) => {
  return res.status(status).json({
    success: true,
    status,
    timestamp: new Date().toISOString(),
    data,
  });
};

/**
 * Định dạng phản hồi lỗi (4xx, 5xx)
 */
export const fail = (
  res: Response,
  message: string,
  code: string = 'ERROR',
  status: number = 400,
  details: any = null
) => {
  const response: any = {
    success: false,
    status,
    timestamp: new Date().toISOString(),
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(status).json(response);
};
