import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/models.types';
import { sendError } from '../utils/response';

/**
 * RBAC guard — use after authenticate()
 * Usage: router.get('/admin', authenticate, requireRole('admin'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      sendError(res, `Access denied — requires role: ${roles.join(' or ')}`, 403);
      return;
    }
    next();
  };
}
