import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/users/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: user, error } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user!.id).single();
    if (error || !user) { sendError(res, 'User not found', 404); return; }
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

// PUT /api/users/me
router.put(
  '/me',
  [
    body('full_name').optional().trim().notEmpty(),
    body('phone').optional().isMobilePhone('any'),
    body('avatar_url').optional().isURL(),
    body('fitness_goal').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allowed = ['full_name', 'phone', 'avatar_url', 'fitness_goal'];
      const updates: Record<string, unknown> = {};
      allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', req.user!.id)
        .select()
        .single();
        
      if (error) throw error;
      sendSuccess(res, user, 'Profile updated');
    } catch (err) { next(err); }
  },
);

// GET /api/users/me/progress
router.get('/me/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { count: totalSessions } = await supabaseAdmin.from('sessions').select('id', { count: 'exact' }).eq('trainee_id', userId);
    const { count: completedSessions } = await supabaseAdmin.from('sessions').select('id', { count: 'exact' }).eq('trainee_id', userId).eq('status', 'completed');
    const { data: bookings } = await supabaseAdmin.from('bookings').select('*').eq('trainee_id', userId).order('created_at', { ascending: false }).limit(30);

    const { data: dates } = await supabaseAdmin.from('sessions').select('scheduled_at').eq('trainee_id', userId).eq('status', 'completed');
    
    const sortedDates = (dates || []).map((d) => new Date(d.scheduled_at).toDateString()).reverse();
    let streak = 0;
    const today = new Date().toDateString();
    let check = new Date();
    for (let i = 0; i < 90; i++) {
      if (sortedDates.includes(check.toDateString())) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else break;
    }

    sendSuccess(res, {
      totalSessions: totalSessions ?? 0,
      completedSessions: completedSessions ?? 0,
      streak,
      caloriesBurned: (completedSessions ?? 0) * 450,
      recentBookings: bookings ?? [],
    });
  } catch (err) { next(err); }
});

export default router;
