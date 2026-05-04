// ─── Enums (same values, no Mongoose dependency) ──────────────────────────
export type UserRole = 'trainee' | 'trainer' | 'org' | 'brand' | 'admin';
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SessionStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type SessionType = 'personal' | 'group';
export type SessionMode = 'online' | 'offline';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PostType = 'reel' | 'post' | 'story';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type Specialisation = 'gym' | 'zumba' | 'calisthenics' | 'yoga' | 'hiit' | 'nutrition' | 'pilates' | 'boxing' | 'running';

// ─── Plain interfaces (UUID strings, not ObjectId) ─────────────────────────
export interface IProfile {
  id: string;              // UUID (Supabase auth.users id)
  full_name: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
  phone?: string;
  fitness_goal?: string;
  subscription_tier: SubscriptionPlan;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ITrainer {
  id: string;
  user_id: string;
  bio?: string;
  specialisations: Specialisation[];
  certifications: Array<{ name: string; url: string; verified: boolean }>;
  price_per_session: number;
  experience_years: number;
  availability: Array<{
    day: string;
    slots: Array<{ start: string; end: string; is_booked: boolean }>;
  }>;
  rating: number;
  review_count: number;
  location?: string;
  is_verified: boolean;
  total_clients: number;
  total_sessions: number;
  created_at: string;
}

export interface ISession {
  id: string;
  trainer_id: string;
  trainee_id?: string;
  group_id?: string;
  type: SessionType;
  mode: SessionMode;
  scheduled_at: string;
  duration_minutes: number;
  status: SessionStatus;
  recording_url?: string;
  notes?: string;
  meet_link?: string;
  price: number;
  created_at: string;
}

export interface IBooking {
  id: string;
  trainee_id: string;
  trainer_id: string;
  session_id: string;
  session_date: string;
  duration_minutes: number;
  session_type: SessionMode;
  status: BookingStatus;
  amount: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  notes?: string;
  created_at: string;
}

export interface IFeedPost {
  id: string;
  author_id: string;
  content?: string;
  media_urls: string[];
  media_type?: 'image' | 'video' | 'text';
  moderation_status: ModerationStatus;
  likes_count: number;
  comments_count: number;
  expires_at?: string;
  created_at: string;
}

export interface IReview {
  id: string;
  trainee_id: string;
  trainer_id: string;
  booking_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface IOrganisation {
  id: string;
  user_id: string;
  name: string;
  logo?: string;
  plan: SubscriptionPlan;
  size: number;
  contact_person?: string;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: unknown[];
}
