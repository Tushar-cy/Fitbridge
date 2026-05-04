import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { sendSuccess, sendError } from '../utils/response';

// GET /api/auth/me — returns profile from Supabase profiles table
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (error || !profile) {
      sendError(res, 'Profile not found', 404);
      return;
    }
    sendSuccess(res, profile);
  } catch (err) { next(err); }
}

// POST /api/auth/logout — Supabase manages session invalidation
// Frontend should call supabase.auth.signOut() directly.
// This endpoint is kept for API completeness (e.g., server-side session cleanup).
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Sign out the user from all devices via service role
    await supabaseAdmin.auth.admin.signOut(req.user!.id);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
}

// POST /api/auth/delete-account — GDPR soft delete
export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supabaseAdmin.rpc('delete_user_by_id', { target_user_id: req.user!.id });
    sendSuccess(res, null, 'Account scheduled for deletion in 30 days');
  } catch (err) { next(err); }
}
