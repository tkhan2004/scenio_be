import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { fail } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'JsonWebTokenError') {
    return fail(res, 'Token không hợp lệ', 'UNAUTHORIZED', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return fail(res, 'Token đã hết hạn', 'UNAUTHORIZED', 401);
  }

  const normalized = normalizeError(err);
  logInternalError(err, req, normalized.status, normalized.code);

  return fail(
    res,
    normalized.message,
    normalized.code,
    normalized.status,
    normalized.details,
  );
};

type NormalizedError = {
  status: number;
  code: string;
  message: string;
  details: any;
};

function normalizeError(err: any): NormalizedError {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return normalizePrismaKnownError(err);
  }

  if (
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return {
      status: 500,
      code: 'DATABASE_ERROR',
      message: 'Dữ liệu hiện chưa xử lý được. Vui lòng thử lại sau.',
      details: null,
    };
  }

  const status = Number.isInteger(err?.status) ? Number(err.status) : 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const code = typeof err?.code === 'string' ? err.code : defaultCodeForStatus(safeStatus);

  if (safeStatus >= 500) {
    return {
      status: safeStatus,
      code,
      message: messageForServerError(code, safeStatus),
      details: null,
    };
  }

  return {
    status: safeStatus,
    code,
    message: typeof err?.message === 'string' && err.message.trim().length > 0
      ? err.message
      : defaultMessageForStatus(safeStatus),
    details: err?.details ?? null,
  };
}

function normalizePrismaKnownError(err: Prisma.PrismaClientKnownRequestError): NormalizedError {
  switch (err.code) {
    case 'P2002':
      return {
        status: 409,
        code: 'CONFLICT',
        message: 'Thông tin này đã được sử dụng.',
        details: null,
      };
    case 'P2025':
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: 'Không tìm thấy dữ liệu phù hợp.',
        details: null,
      };
    default:
      return {
        status: 500,
        code: 'DATABASE_ERROR',
        message: 'Dữ liệu hiện chưa xử lý được. Vui lòng thử lại sau.',
        details: null,
      };
  }
}

function messageForServerError(code: string, status: number) {
  if (status === 502 || code.includes('AI') || code.includes('PROVIDER')) {
    return 'Dịch vụ AI đang tạm thời gián đoạn. Vui lòng thử lại sau.';
  }

  if (code.includes('DATABASE')) {
    return 'Dữ liệu hiện chưa xử lý được. Vui lòng thử lại sau.';
  }

  return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
}

function defaultMessageForStatus(status: number) {
  switch (status) {
    case 400:
      return 'Thông tin gửi lên chưa hợp lệ.';
    case 401:
      return 'Bạn cần đăng nhập để tiếp tục.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy dữ liệu phù hợp.';
    case 409:
      return 'Trạng thái hiện tại chưa thể thực hiện thao tác này.';
    default:
      return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
  }
}

function defaultCodeForStatus(status: number) {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'INTERNAL_ERROR';
  }
}

function logInternalError(err: any, req: Request, status: number, code: string) {
  if (status < 500) return;

  const requestInfo = `${req.method} ${req.originalUrl}`;
  const message = err instanceof Error ? err.stack ?? err.message : err;
  console.error(`[errorHandler] ${status} ${code} ${requestInfo}`, message);
}
