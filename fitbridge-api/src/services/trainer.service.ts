import { supabaseAdmin } from '../config/supabaseAdmin';
import { AppError } from '../middleware/errorHandler';
import { parsePagination, buildMeta } from '../utils/pagination';
import { setCache, getCache, deleteCache } from '../config/redis';
import { Request } from 'express';
import { ITrainer } from '../types/models.types';

export async function listTrainers(req: Request) {
  const { specialisation, minRating, maxPrice, search } = req.query as Record<string, string>;
  const { page, limit, skip } = parsePagination(req);

  let query = supabaseAdmin
    .from('trainers')
    .select(`
      *,
      profile:profiles(full_name, avatar_url, is_email_verified)
    `, { count: 'exact' })
    .eq('is_verified', true);

  if (specialisation) {
    query = query.contains('specialisations', [specialisation]);
  }
  if (minRating) {
    query = query.gte('rating', parseFloat(minRating));
  }
  if (maxPrice) {
    query = query.lte('price_per_session', parseFloat(maxPrice));
  }
  if (search) {
    query = query.or(`bio.ilike.%${search}%,location.ilike.%${search}%`);
  }

  const { data: trainers, count, error } = await query
    .order('rating', { ascending: false })
    .range(skip, skip + limit - 1);

  if (error) throw error;
  return { data: trainers ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

export async function getTrainerById(id: string) {
  const cacheKey = `trainer:${id}`;
  const cached = await getCache<ITrainer>(cacheKey);
  if (cached) return cached;

  const { data: trainer, error } = await supabaseAdmin
    .from('trainers')
    .select('*, profile:profiles(full_name, avatar_url, email, is_email_verified)')
    .eq('id', id)
    .single();

  if (error || !trainer) throw new AppError('Trainer not found', 404);
  await setCache(cacheKey, trainer, 300);
  return trainer;
}

export async function getTrainerByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('trainers').select('*').eq('user_id', userId).single();
  if (error || !data) throw new AppError('Trainer profile not found', 404);
  return data;
}

export async function getTrainerAvailability(trainerId: string) {
  const { data, error } = await supabaseAdmin
    .from('trainers').select('availability').eq('id', trainerId).single();
  if (error || !data) throw new AppError('Trainer not found', 404);
  return data.availability;
}

export async function updateTrainerProfile(userId: string, updates: Partial<ITrainer>) {
  const { data, error } = await supabaseAdmin
    .from('trainers')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) throw new AppError('Trainer profile not found', 404);
  await deleteCache(`trainer:${data.id}`);
  return data;
}

export async function getTrainerReviews(trainerId: string, req: Request) {
  const { page, limit, skip } = parsePagination(req);
  const { data: reviews, count, error } = await supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles(full_name, avatar_url)', { count: 'exact' })
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false })
    .range(skip, skip + limit - 1);
  if (error) throw error;
  return { data: reviews ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

export async function uploadCertification(
  userId: string,
  cert: { name: string; url: string }
) {
  // Get current certifications array first
  const { data: trainer } = await supabaseAdmin
    .from('trainers').select('certifications, id').eq('user_id', userId).single();
  if (!trainer) throw new AppError('Trainer profile not found', 404);

  const updatedCerts = [
    ...(trainer.certifications ?? []),
    { ...cert, verified: false }
  ];

  const { data, error } = await supabaseAdmin
    .from('trainers')
    .update({ certifications: updatedCerts })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  await deleteCache(`trainer:${trainer.id}`);
  return data;
}
