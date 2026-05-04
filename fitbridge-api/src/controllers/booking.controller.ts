import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { parsePagination, buildMeta } from '../utils/pagination';
import { getIo } from '../socket/socket';

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.body;
    
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (!session) { sendError(res, 'Session not found', 404); return; }
    if (session.status !== 'upcoming') { sendError(res, 'Session is not available for booking', 400); return; }

    const { data: existing } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('trainee_id', req.user!.id)
      .eq('session_id', sessionId)
      .maybeSingle();
      
    if (existing) { sendError(res, 'Already booked this session', 409); return; }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        trainee_id: req.user!.id,
        trainer_id: session.trainer_id,
        session_id: sessionId,
        session_date: session.scheduled_at,
        duration_minutes: session.duration_minutes,
        session_type: session.mode,
        amount: session.price,
        status: 'confirmed', 
        payment_status: 'paid',
        razorpay_payment_id: `mock_pay_${Date.now()}`,
      })
      .select()
      .single();
      
    if (error) throw error;

    await supabaseAdmin
      .from('sessions')
      .update({ trainee_id: req.user!.id })
      .eq('id', sessionId);

    try {
      const io = getIo();
      io.to(req.user!.id).emit('booking:confirmed', { bookingId: booking.id, sessionId });
    } catch { /* socket may not be ready */ }

    sendCreated(res, booking, 'Booking confirmed');
  } catch (err) { next(err); }
}

export async function listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req);
    const { data: bookings, count, error } = await supabaseAdmin
      .from('bookings')
      .select('*, session:sessions(*, trainer:trainers(specialisations, rating))', { count: 'exact' })
      .eq('trainee_id', req.user!.id)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
      
    if (error) throw error;
    sendSuccess(res, bookings, 'Bookings fetched', 200, buildMeta(count ?? 0, page, limit));
  } catch (err) { next(err); }
}

export async function getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, session:sessions(*)')
      .eq('id', req.params.id)
      .eq('trainee_id', req.user!.id)
      .single();
      
    if (error || !booking) { sendError(res, 'Booking not found', 404); return; }
    sendSuccess(res, booking);
  } catch (err) { next(err); }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('trainee_id', req.user!.id)
      .single();
      
    if (!booking) { sendError(res, 'Booking not found', 404); return; }
    if (['cancelled', 'completed'].includes(booking.status)) {
      sendError(res, `Booking is already ${booking.status}`, 400); return;
    }
    
    const { data: updated, error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    sendSuccess(res, updated, 'Booking cancelled');
  } catch (err) { next(err); }
}
