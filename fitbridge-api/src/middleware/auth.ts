import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'] || req.headers.authorization;
  const token = authHeader?.split(' ')[1] || authHeader?.slice(7); // Bearer <token>
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email!,
    role: user.user_metadata?.role ?? 'trainee',
    jti: '',
  };
  next();
}

// Keep the old 'authenticate' alias so routes don't break
export const authenticate = authenticateToken;

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role ?? 'trainee',
          jti: '',
        };
      }
    }
  } catch { /* token absent or invalid — continue as unauthenticated */ }
  next();
}
