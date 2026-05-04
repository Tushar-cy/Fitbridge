import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue ?? {})[0] ?? 'field';
    res.status(409).json({ success: false, message: `${field} already exists` });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values((err as any).errors ?? {}).map((e: any) => e.message);
    res.status(400).json({ success: false, message: 'Validation error', errors: messages });
    return;
  }

  // Cast error (bad ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({ success: false, message: 'Invalid ID format' });
    return;
  }

  // Unknown error
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: ENV.IS_PRODUCTION ? 'Internal server error' : err.message,
    ...(ENV.IS_PRODUCTION ? {} : { stack: err.stack }),
  });
}
