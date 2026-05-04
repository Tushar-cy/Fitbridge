import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';
import { Request, Response } from 'express';

const handler = (_req: Request, res: Response) => {
  sendError(res, 'Too many requests — please slow down', 429);
};

/** General: 100 requests per 15 minutes */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Auth endpoints: 10 requests per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: (req) => process.env.NODE_ENV === 'test',
});

/** Upload: 20 per hour */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
