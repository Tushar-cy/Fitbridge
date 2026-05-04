import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { parsePagination, buildMeta } from '../utils/pagination';

export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { trainerId, sessionId, rating, comment } = req.body;

    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('trainee_id', req.user!.id)
      .eq('status', 'completed')
      .single();
      
    if (!session) { sendError(res, 'Session not found or not completed', 400); return; }

    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();
      
    if (existing) { sendError(res, 'Review already submitted for this session', 409); return; }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        trainee_id: req.user!.id,
        trainer_id: trainerId,
        session_id: sessionId,
        rating,
        comment,
      })
      .select()
      .single();
      
    if (error) throw error;

    await supabaseAdmin.rpc('update_trainer_rating', { t_id: trainerId });
    
    sendCreated(res, review, 'Review submitted');
  } catch (err) { next(err); }
}

export async function getTrainerReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { data: reviews, count, error } = await supabaseAdmin
      .from('reviews')
      .select('*, trainee:profiles(full_name, avatar_url)', { count: 'exact' })
      .eq('trainer_id', req.params.trainerId)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
      
    if (error) throw error;
    sendSuccess(res, reviews, 'Reviews fetched', 200, buildMeta(count ?? 0, page, limit));
  } catch (err) { next(err); }
}
