/**
 * supabaseService.ts — Real Supabase data queries for FitBridge.
 *
 * Replaces direct mockData imports in screens.
 *
 * Fallback strategy:
 *   Every function catches Supabase errors and logs them.
 *   If the table doesn't exist yet (schema not run), it falls back to
 *   returning mock data so the UI stays functional during development.
 *
 * Usage in screens:
 *   import { supabaseService } from '../../services/api/supabaseService';
 *   const trainers = await supabaseService.getTrainers({ maxPrice: 2000 });
 */

import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../types/user.types';
import type { Post } from '../../types/feed.types';
import { mockTrainers } from '../../utils/mockData/mockTrainers';
import { mockSessions } from '../../utils/mockData/mockSessions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrainerFilters {
  specialisation?: string;
  maxPrice?: number;
  minRating?: number;
  location?: string;
  isVerified?: boolean;
}

export interface NewBooking {
  traineeId: string;
  trainerId: string;        // trainers.id (not user_id)
  sessionDate: string;      // ISO timestamp
  durationMinutes?: number;
  sessionType: 'online' | 'offline' | 'group';
  amount: number;
  notes?: string;
}

export interface BookingRecord {
  id: string;
  traineeId: string;
  trainerId: string;
  sessionDate: string;
  durationMinutes: number;
  sessionType: string;
  status: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  notes?: string;
  meetLink?: string;
  createdAt: string;
  // Joined fields
  trainer?: Trainer;
  trainerName?: string;
  trainerAvatar?: string;
  traineeName?: string;
  traineeAvatar?: string;
}

export interface ScanData {
  bmi?: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  leanMassKg?: number;
  weightKg?: number;
  postureScore?: number;
  overallScore?: number;
  bodyShape?: 'ectomorph' | 'mesomorph' | 'endomorph';
  photoUrls?: string[];
  generatedPlan?: Record<string, any>;
  aiSummary?: string;
}

export interface BodyScan extends ScanData {
  id: string;
  userId: string;
  scanDate: string;
  createdAt: string;
}

// ── DB row → App type mappers ─────────────────────────────────────────────────

function mapTrainerRow(row: any): Trainer {
  // name: direct column (seeded mock) → profiles join (real user) → fallback
  const name   = row.name ?? row.profiles?.full_name ?? 'Trainer';
  const avatar = row.avatar_url ?? row.profiles?.avatar_url
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=200`;

  return {
    id:              row.id,
    userId:          row.user_id,
    name,
    specialisation:  row.specialisations ?? [],
    rating:          Number(row.rating) || 0,
    reviewCount:     row.review_count ?? 0,
    pricePerSession: Number(row.price_per_session) || 0,
    photo:           avatar,
    verified:        row.is_verified ?? false,
    bio:             row.bio ?? '',
    tags:            row.specialisations ?? [],
    availability:    Array.isArray(row.availability)
                       ? row.availability.map((a: any) => a.day ?? a)
                       : [],
    totalClients:    row.total_clients ?? 0,
    experience:      row.experience_years ?? 0,
    location:        row.location ?? '',
    certifications:  row.certifications ?? [],
  };
}


function mapBookingRow(row: any): BookingRecord {
  return {
    id:                  row.id,
    traineeId:           row.trainee_id,
    trainerId:           row.trainer_id,
    sessionDate:         row.session_date,
    durationMinutes:     row.duration_minutes ?? 60,
    sessionType:         row.session_type,
    status:              row.status,
    amount:              Number(row.amount) ?? 0,
    currency:            row.currency ?? 'INR',
    paymentStatus:       row.payment_status,
    razorpayOrderId:     row.razorpay_order_id,
    razorpayPaymentId:   row.razorpay_payment_id,
    notes:               row.notes,
    createdAt:           row.created_at,
    trainerName:         row.trainers?.profiles?.full_name,
    trainerAvatar:       row.trainers?.profiles?.avatar_url,
    traineeName:         row.profiles?.full_name,
    traineeAvatar:       row.profiles?.avatar_url,
  };
}

function mapPostRow(row: any): Post {
  return {
    id:             row.id,
    type:           row.media_type === 'video' ? 'reel' : 'image',
    authorId:       row.author_id,
    authorName:     row.author?.full_name ?? row.profiles?.full_name ?? 'FitBridge User',
    authorAvatar:   row.author?.avatar_url ?? row.profiles?.avatar_url ?? `https://picsum.photos/seed/${row.author_id}/200/200`,
    authorVerified: (row.author?.role ?? row.profiles?.role) === 'trainer',
    imageUrl:       row.media_type === 'image' ? row.media_urls?.[0] : undefined,
    videoUrl:       row.media_type === 'video' ? row.media_urls?.[0] : undefined,
    thumbnailUrl:   row.media_urls?.[0],
    caption:        row.content ?? '',
    tags:           row.tags ?? [],
    likes:          row.likes_count ?? 0,
    comments:       row.comments_count ?? 0,
    shares:         row.shares_count ?? 0,
    isLiked:        false,
    createdAt:      row.created_at,
  };
}

function mapScanRow(row: any): BodyScan {
  return {
    id:              row.id,
    userId:          row.user_id,
    scanDate:        row.created_at,
    bmi:             row.bmi,
    bodyFatPercent:  row.body_fat_percent,
    muscleMassKg:    row.muscle_mass_kg,
    leanMassKg:      row.lean_mass_kg,
    weightKg:        row.weight_kg,
    postureScore:    row.posture_score,
    overallScore:    row.overall_score,
    bodyShape:       row.body_shape,
    photoUrls:       row.photo_urls ?? [],
    generatedPlan:   row.generated_plan,
    aiSummary:       row.ai_summary,
    createdAt:       row.created_at,
  };
}

// ── Trainer queries ───────────────────────────────────────────────────────────

async function getTrainers(filters?: TrainerFilters): Promise<Trainer[]> {
  try {
    let query = supabase
      .from('trainers')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .order('rating', { ascending: false });

    if (filters?.isVerified !== false) {
      // Default: only show verified trainers (matches RLS policy)
      query = query.eq('is_verified', true);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('price_per_session', filters.maxPrice);
    }
    if (filters?.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters?.specialisation) {
      // PostgreSQL array contains operator
      query = query.contains('specialisations', [filters.specialisation]);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[supabaseService.getTrainers]', error.message);
      return mockTrainers; // graceful fallback
    }

    return (data ?? []).map(mapTrainerRow);
  } catch (err) {
    console.warn('[supabaseService.getTrainers] unexpected:', err);
    return mockTrainers;
  }
}

async function getTrainerById(trainerId: string): Promise<Trainer | null> {
  try {
    const { data, error } = await supabase
      .from('trainers')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('id', trainerId)
      .maybeSingle();

    if (error) {
      console.warn('[supabaseService.getTrainerById]', error.message);
      return mockTrainers.find((t) => t.id === trainerId) ?? null;
    }

    return data ? mapTrainerRow(data) : null;
  } catch (err) {
    console.warn('[supabaseService.getTrainerById] unexpected:', err);
    return mockTrainers.find((t) => t.id === trainerId) ?? null;
  }
}

// ── Booking queries ───────────────────────────────────────────────────────────

async function getBookingById(bookingId: string): Promise<BookingRecord | null> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trainers (
          id,
          profiles (
            full_name,
            avatar_url
          )
        ),
        trainee:profiles!bookings_trainee_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      console.warn('[supabaseService.getBookingById]', error?.message);
      return null;
    }

    return {
      id: data.id,
      traineeId: data.trainee_id,
      trainerId: data.trainer_id,
      traineeName: data.trainee?.full_name,
      traineeAvatar: data.trainee?.avatar_url,
      trainerName: data.trainers?.profiles?.full_name,
      trainerAvatar: data.trainers?.profiles?.avatar_url,
      sessionDate: data.session_date,
      durationMinutes: data.duration_minutes,
      sessionType: data.session_type,
      amount: data.amount,
      currency: data.currency ?? 'INR',
      status: data.status,
      paymentStatus: data.payment_status,
      meetLink: data.meet_link,
      notes: data.notes,
      createdAt: data.created_at,
    } as BookingRecord;
  } catch (err) {
    console.warn('[supabaseService.getBookingById] unexpected:', err);
    return null;
  }
}

async function getMyBookings(
  userId: string,
  role: 'trainee' | 'trainer',
): Promise<BookingRecord[]> {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        trainers (
          id,
          profiles (
            full_name,
            avatar_url
          )
        ),
        profiles!bookings_trainee_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .order('session_date', { ascending: false });

    if (role === 'trainee') {
      query = query.eq('trainee_id', userId);
    } else {
      // Trainer: find their trainers.id first, then filter
      const { data: trainerRow } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!trainerRow) return [];
      query = query.eq('trainer_id', trainerRow.id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[supabaseService.getMyBookings]', error.message);
      // Fallback: return mock sessions shaped as BookingRecord[]
      return mockSessions.map((s: any) => ({
        id:              s.id,
        traineeId:       s.traineeId ?? '',
        trainerId:       s.trainerId ?? '',
        sessionDate:     s.date ?? new Date().toISOString(),
        durationMinutes: s.duration ?? 60,
        sessionType:     s.type === 'virtual' ? 'online' : 'offline',
        status:          s.status ?? 'pending',
        amount:          s.price ?? 0,
        currency:        'INR',
        paymentStatus:   'paid',
        createdAt:       new Date().toISOString(),
        trainerName:     s.trainer?.name,
        trainerAvatar:   s.trainer?.photo,
      }));
    }

    return (data ?? []).map(mapBookingRow);
  } catch (err) {
    console.warn('[supabaseService.getMyBookings] unexpected:', err);
    return [];
  }
}

async function createBooking(bookingData: NewBooking): Promise<BookingRecord> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      trainee_id:       bookingData.traineeId,
      trainer_id:       bookingData.trainerId,
      session_date:     bookingData.sessionDate,
      duration_minutes: bookingData.durationMinutes ?? 60,
      session_type:     bookingData.sessionType,
      amount:           bookingData.amount,
      currency:         'INR',
      notes:            bookingData.notes,
      status:           'pending',
      payment_status:   'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create booking: ${error.message}`);
  return mapBookingRow(data);
}

async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show',
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);

  if (error) throw new Error(`Failed to update booking: ${error.message}`);
}

async function updateBookingPayment(
  bookingId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      razorpay_order_id:   razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature:  razorpaySignature,
      payment_status:      'paid',
      status:              'confirmed',
    })
    .eq('id', bookingId);

  if (error) throw new Error(`Failed to update booking payment: ${error.message}`);
}

// ── Body scan queries ─────────────────────────────────────────────────────────

async function saveScanResult(
  userId: string,
  scanData: ScanData,
): Promise<BodyScan> {
  const { data, error } = await supabase
    .from('body_scans')
    .insert({
      user_id:          userId,
      bmi:              scanData.bmi,
      body_fat_percent: scanData.bodyFatPercent,
      muscle_mass_kg:   scanData.muscleMassKg,
      lean_mass_kg:     scanData.leanMassKg,
      weight_kg:        scanData.weightKg,
      posture_score:    scanData.postureScore,
      overall_score:    scanData.overallScore,
      body_shape:       scanData.bodyShape,
      photo_urls:       scanData.photoUrls ?? [],
      generated_plan:   scanData.generatedPlan,
      ai_summary:       scanData.aiSummary,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save scan: ${error.message}`);
  return mapScanRow(data);
}

async function getScanHistory(userId: string): Promise<BodyScan[]> {
  try {
    const { data, error } = await supabase
      .from('body_scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[supabaseService.getScanHistory]', error.message);
      return [];
    }

    return (data ?? []).map(mapScanRow);
  } catch (err) {
    console.warn('[supabaseService.getScanHistory] unexpected:', err);
    return [];
  }
}

// ── Feed / post queries ───────────────────────────────────────────────────────

async function getPosts(page = 0, limit = 20): Promise<Post[]> {
  try {
    const from = page * limit;
    const to   = from + limit - 1;

    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        author:profiles (
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.warn('[supabaseService.getPosts] Supabase error:', error.message, '| Code:', error.code);
      return [];  // Return empty — no fake data
    }

    return (data ?? []).map(mapPostRow);
  } catch (err) {
    console.warn('[supabaseService.getPosts] unexpected:', err);
    return [];
  }
}

async function createPost(
  authorId: string,
  content: string,
  mediaUrls: string[] = [],
  mediaType: 'image' | 'video' | 'text' = 'text',
  tags: string[] = [],
): Promise<Post> {
  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      author_id:          authorId,
      content,
      media_urls:         mediaUrls,
      media_type:         mediaType,
      tags,
      moderation_status:  'approved',  // Auto-approve for MVP
    })
    .select(`
      *,
      author:profiles (
        full_name,
        avatar_url,
        role
      )
    `)
    .single();

  if (error) throw new Error(`Failed to create post: ${error.message}`);
  return mapPostRow(data);
}

// ── Profile queries ───────────────────────────────────────────────────────────

async function getProfile(userId: string): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[supabaseService.getProfile]', error.message);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function updateProfile(
  userId: string,
  updates: {
    fullName?: string;
    avatarUrl?: string;
    phone?: string;
    bio?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:  updates.fullName,
      avatar_url: updates.avatarUrl,
      phone:      updates.phone,
      bio:        updates.bio,
    })
    .eq('id', userId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
}

// ── Exported service object ───────────────────────────────────────────────────

export const supabaseService = {
  // Trainers
  getTrainers,
  getTrainerById,
  // Bookings
  getBookingById,
  getMyBookings,
  createBooking,
  updateBookingStatus,
  updateBookingPayment,
  // Body scans
  saveScanResult,
  getScanHistory,
  // Feed
  getPosts,
  createPost,
  // Profiles
  getProfile,
  updateProfile,
};

export default supabaseService;
