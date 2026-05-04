import { Request, Response, NextFunction } from 'express';
import {
  createSession,
  listSessions,
  getSessionById,
  updateSessionStatus,
  deleteSession,
} from '../services/session.service';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { SessionStatus } from '../types/models.types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: profile } = await supabaseAdmin.from('trainers').select('id').eq('user_id', req.user!.id).single();
    if (!profile) { sendError(res, 'Trainer profile not found', 404); return; }
    const session = await createSession(profile.id, req.body);
    sendCreated(res, session, 'Session created');
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listSessions(req.user!.id, req.user!.role, req);
    sendSuccess(res, result.data, 'Sessions fetched', 200, result.meta);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await getSessionById(String(req.params.id));
    sendSuccess(res, session);
  } catch (err) { next(err); }
}

export async function patchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as { status: SessionStatus };
    const session = await updateSessionStatus(String(req.params.id), status, req.user!.id, req.user!.role);
    sendSuccess(res, session, `Session ${status}`);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteSession(String(req.params.id), req.user!.id);
    sendSuccess(res, null, 'Session deleted');
  } catch (err) { next(err); }
}
