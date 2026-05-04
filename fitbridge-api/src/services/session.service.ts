import { supabaseAdmin } from '../config/supabaseAdmin';
import { AppError } from '../middleware/errorHandler';
import { parsePagination, buildMeta } from '../utils/pagination';
import { Request } from 'express';
import { ISession, SessionStatus } from '../types/models.types';

export async function createSession(trainerId: string, body: Partial<ISession>) {
  const { data: trainer } = await supabaseAdmin.from('trainers').select('id').eq('id', trainerId).single();
  if (!trainer) throw new AppError('Trainer profile not found', 404);

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      ...body,
      trainer_id: trainerId,
      status: 'upcoming',
    })
    .select()
    .single();

  if (error) throw error;
  return session;
}

export async function listSessions(userId: string, role: string, req: Request) {
  const { page, limit, skip } = parsePagination(req);
  const { status } = req.query as Record<string, string>;

  let query = supabaseAdmin.from('sessions').select('*, trainer:trainers(*), trainee:profiles(*)', { count: 'exact' });

  if (role === 'trainer') {
    const { data: profile } = await supabaseAdmin.from('trainers').select('id').eq('user_id', userId).single();
    if (profile) {
      query = query.eq('trainer_id', profile.id);
    } else {
      return { data: [], meta: buildMeta(0, page, limit) };
    }
  } else {
    query = query.eq('trainee_id', userId);
  }

  if (status) query = query.eq('status', status);

  const { data: sessions, count, error } = await query
    .order('scheduled_at', { ascending: false })
    .range(skip, skip + limit - 1);

  if (error) throw error;
  return { data: sessions, meta: buildMeta(count ?? 0, page, limit) };
}

export async function getSessionById(id: string) {
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .select('*, trainer:trainers(user:profiles(*)), trainee:profiles(*)')
    .eq('id', id)
    .single();
  if (error || !session) throw new AppError('Session not found', 404);
  return session;
}

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  upcoming: ['live', 'cancelled'],
  live: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function updateSessionStatus(
  sessionId: string,
  newStatus: SessionStatus,
  userId: string,
  role: string,
) {
  const { data: session } = await supabaseAdmin.from('sessions').select('*').eq('id', sessionId).single();
  if (!session) throw new AppError('Session not found', 404);

  if (role === 'trainer') {
    const { data: profile } = await supabaseAdmin.from('trainers').select('id').eq('user_id', userId).single();
    if (!profile || session.trainer_id !== profile.id) {
      throw new AppError('Not authorised to update this session', 403);
    }
  }

  const allowed = VALID_TRANSITIONS[session.status as SessionStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(`Cannot transition from ${session.status} to ${newStatus}`, 400);
  }

  const { data: updated, error } = await supabaseAdmin
    .from('sessions')
    .update({ status: newStatus })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;

  if (newStatus === 'completed') {
    await supabaseAdmin.from('bookings').update({ status: 'completed' }).eq('session_id', sessionId);
  }
  if (newStatus === 'cancelled') {
    await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('session_id', sessionId).neq('status', 'completed');
  }

  return updated;
}

export async function deleteSession(sessionId: string, userId: string) {
  const { data: profile } = await supabaseAdmin.from('trainers').select('id').eq('user_id', userId).single();
  if (!profile) throw new AppError('Trainer profile not found', 404);

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('trainer_id', profile.id)
    .select()
    .single();

  if (error || !session) throw new AppError('Session not found or not owned by you', 404);
  return session;
}
