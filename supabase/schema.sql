-- ============================================================
-- FitBridge — Complete Supabase Schema
-- Run this in your Supabase Dashboard > SQL Editor
-- Project: aawrgizwblaajotvepww
-- ============================================================

-- ── Enable UUID extension ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE (core — must exist for auth to work)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'trainee'
                    CHECK (role IN ('trainee','trainer','brand','org','admin')),
  avatar_url      TEXT,
  bio             TEXT,
  location        TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
                    CHECK (subscription_tier IN ('free','pro','elite')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'trainee'),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view any profile" ON public.profiles;
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. USER SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT,
  device_os   TEXT,
  is_current  BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions"
  ON public.user_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 3. TRAINERS TABLE (trainer-specific profile extension)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trainers (
  id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialisation  TEXT[] DEFAULT '{}',
  certifications  TEXT[] DEFAULT '{}',
  experience_years INT DEFAULT 0,
  price_per_session NUMERIC(10,2) DEFAULT 0,
  rating          NUMERIC(3,2) DEFAULT 0,
  review_count    INT DEFAULT 0,
  total_clients   INT DEFAULT 0,
  verified        BOOLEAN DEFAULT FALSE,
  availability    JSONB DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers are publicly viewable" ON public.trainers;
CREATE POLICY "Trainers are publicly viewable"
  ON public.trainers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Trainers can update own record" ON public.trainers;
CREATE POLICY "Trainers can update own record"
  ON public.trainers FOR ALL USING (auth.uid() = id);

-- ============================================================
-- 4. POSTS TABLE (FitFeed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  media_urls    TEXT[] DEFAULT '{}',
  media_type    TEXT DEFAULT 'text' CHECK (media_type IN ('text','image','video')),
  tags          TEXT[] DEFAULT '{}',
  like_count    INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_moderated  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are publicly viewable" ON public.posts;
CREATE POLICY "Posts are publicly viewable"
  ON public.posts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- 5. POST LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are publicly viewable" ON public.post_likes;
CREATE POLICY "Likes are publicly viewable"
  ON public.post_likes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can like/unlike posts" ON public.post_likes;
CREATE POLICY "Users can like/unlike posts"
  ON public.post_likes FOR ALL USING (auth.uid() = user_id);

-- Increment / decrement like count functions
CREATE OR REPLACE FUNCTION public.increment_likes(post_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.posts SET like_count = like_count + 1 WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_likes(post_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.posts SET like_count = GREATEST(0, like_count - 1) WHERE id = post_id;
END;
$$;

-- ============================================================
-- 6. POST COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are publicly viewable" ON public.post_comments;
CREATE POLICY "Comments are publicly viewable"
  ON public.post_comments FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can post comments" ON public.post_comments;
CREATE POLICY "Users can post comments"
  ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- 7. BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainee_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  session_time  TEXT NOT NULL,
  mode          TEXT DEFAULT 'online' CHECK (mode IN ('online','offline')),
  status        TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','completed','cancelled')),
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_id    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = trainee_id OR auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainees can create bookings" ON public.bookings;
CREATE POLICY "Trainees can create bookings"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = trainee_id);

DROP POLICY IF EXISTS "Trainer can update booking status" ON public.bookings;
CREATE POLICY "Trainer can update booking status"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = trainer_id OR auth.uid() = trainee_id);

-- ============================================================
-- 8. CHAT THREADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant1, participant2)
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own threads" ON public.chat_threads;
CREATE POLICY "Users can view own threads"
  ON public.chat_threads FOR SELECT
  USING (auth.uid() = participant1 OR auth.uid() = participant2);

DROP POLICY IF EXISTS "Users can create threads" ON public.chat_threads;
CREATE POLICY "Users can create threads"
  ON public.chat_threads FOR INSERT
  WITH CHECK (auth.uid() = participant1 OR auth.uid() = participant2);

-- ============================================================
-- 9. CHAT MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id  UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  media_url  TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thread participants can view messages" ON public.chat_messages;
CREATE POLICY "Thread participants can view messages"
  ON public.chat_messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT participant1 FROM public.chat_threads WHERE id = thread_id
      UNION
      SELECT participant2 FROM public.chat_threads WHERE id = thread_id
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- 10. BODY SCANS TABLE (AI Scan results)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.body_scans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_urls      TEXT[] DEFAULT '{}',
  overall_score   INT,
  bmi             NUMERIC(5,2),
  body_fat_pct    NUMERIC(5,2),
  muscle_mass_pct NUMERIC(5,2),
  posture_score   INT,
  recommendations TEXT[],
  raw_analysis    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scans" ON public.body_scans;
CREATE POLICY "Users can view own scans"
  ON public.body_scans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own scans" ON public.body_scans;
CREATE POLICY "Users can create own scans"
  ON public.body_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 12. REALTIME — enable for live features
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- ============================================================
-- Done! All FitBridge tables created.
-- ============================================================
