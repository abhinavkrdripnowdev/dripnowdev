import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (['ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY'].includes((err as any).code)) { sendError(res, 'This action has already been completed or conflicts with existing data', 409); return; }
  const statusCode = err instanceof ZodError ? 422 : err.statusCode ?? 500;
  const message =
    statusCode < 500 || err.isOperational || env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error';

  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode}: ${err.message}`, {
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  sendError(res, message, statusCode);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

export function createError(message: string, statusCode = 400): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}
