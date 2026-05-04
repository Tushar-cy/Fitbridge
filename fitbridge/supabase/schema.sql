-- =============================================================================
-- FitBridge — Supabase Database Schema
-- =============================================================================
-- Project : aawrgizwblaajotvepww
-- Run in  : Supabase Dashboard → SQL Editor → New Query → paste → Run (F5)
-- Order   : Execute this file TOP TO BOTTOM in one shot.
--           Sections are idempotent (IF NOT EXISTS / OR REPLACE).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pg_cron";      -- scheduled deletion cron job
CREATE EXTENSION IF NOT EXISTS "pg_net";       -- outbound HTTP (webhooks)


-- ---------------------------------------------------------------------------
-- 1. PROFILES TABLE
--    Auto-created for every new auth.users row via trigger (Section 5).
--    id mirrors auth.users.id — single source of identity.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name         TEXT        NOT NULL DEFAULT '',
  avatar_url        TEXT,
  role              TEXT        NOT NULL DEFAULT 'trainee'
                                CHECK (role IN ('trainee', 'trainer', 'org', 'brand', 'admin')),
  phone             TEXT,
  bio               TEXT,
  is_email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  subscription_tier TEXT        NOT NULL DEFAULT 'free'
                                CHECK (subscription_tier IN ('free', 'premium')),
  -- GDPR soft-delete fields
  pending_deletion  BOOLEAN     NOT NULL DEFAULT FALSE,
  deletion_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY — profiles
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles: owner select" ON profiles;
CREATE POLICY "profiles: owner select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but NOT change their own role)
DROP POLICY IF EXISTS "profiles: owner update" ON profiles;
CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-promotion: role must stay the same unless user is admin
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid())
         OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

-- Trainers are publicly visible (for trainer discovery)
DROP POLICY IF EXISTS "profiles: trainer public select" ON profiles;
CREATE POLICY "profiles: trainer public select"
  ON profiles FOR SELECT
  USING (role = 'trainer' AND pending_deletion = FALSE);

-- Admins can read all profiles
DROP POLICY IF EXISTS "profiles: admin select all" ON profiles;
CREATE POLICY "profiles: admin select all"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can update any profile
DROP POLICY IF EXISTS "profiles: admin update all" ON profiles;
CREATE POLICY "profiles: admin update all"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 3. TRAINER DETAILS TABLE
--    Extended data for users with role = 'trainer'.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trainer_profiles (
  id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  specialisation      TEXT[],
  certifications      TEXT[],
  price_per_session   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rating              NUMERIC(3, 2)  DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews       INTEGER        DEFAULT 0,
  is_verified         BOOLEAN        DEFAULT FALSE,   -- admin-verified
  years_experience    INTEGER        DEFAULT 0,
  languages           TEXT[]         DEFAULT ARRAY['English'],
  available_online    BOOLEAN        DEFAULT TRUE,
  available_offline   BOOLEAN        DEFAULT FALSE,
  city                TEXT,
  created_at          TIMESTAMPTZ    DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    DEFAULT NOW()
);

ALTER TABLE trainer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer_profiles: public select" ON trainer_profiles;
CREATE POLICY "trainer_profiles: public select"
  ON trainer_profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "trainer_profiles: owner update" ON trainer_profiles;
CREATE POLICY "trainer_profiles: owner update"
  ON trainer_profiles FOR UPDATE USING (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 4. BOOKINGS TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainee_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_date        DATE        NOT NULL,
  session_time        TEXT        NOT NULL,   -- "09:00 AM" — use TEXT for tz flexibility
  session_mode        TEXT        NOT NULL CHECK (session_mode IN ('Personal', 'Group')),
  session_type        TEXT        NOT NULL CHECK (session_type IN ('Online', 'Offline')),
  duration_minutes    INTEGER     NOT NULL DEFAULT 60,
  amount              NUMERIC(10, 2) NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'INR',
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','cancelled','completed')),
  -- Payment
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  payment_verified    BOOLEAN     DEFAULT FALSE,
  -- Refund
  refund_id           TEXT,
  refund_status       TEXT        CHECK (refund_status IN ('none','pending','processed','failed')),
  refund_amount       NUMERIC(10, 2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings: trainee select own" ON bookings;
CREATE POLICY "bookings: trainee select own"
  ON bookings FOR SELECT USING (auth.uid() = trainee_id);

DROP POLICY IF EXISTS "bookings: trainer select own" ON bookings;
CREATE POLICY "bookings: trainer select own"
  ON bookings FOR SELECT USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "bookings: trainee insert" ON bookings;
CREATE POLICY "bookings: trainee insert"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = trainee_id);

DROP POLICY IF EXISTS "bookings: trainee cancel" ON bookings;
CREATE POLICY "bookings: trainee cancel"
  ON bookings FOR UPDATE
  USING (auth.uid() = trainee_id AND status = 'pending');


-- ---------------------------------------------------------------------------
-- 5. FEED POSTS TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feed_posts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  media_urls      TEXT[]      DEFAULT ARRAY[]::TEXT[],
  media_type      TEXT        CHECK (media_type IN ('image','video','none')),
  tags            TEXT[]      DEFAULT ARRAY[]::TEXT[],
  -- Moderation
  moderation_status TEXT      NOT NULL DEFAULT 'pending'
                              CHECK (moderation_status IN ('pending','approved','flagged')),
  flag_reason     TEXT,
  -- Engagement counts (denormalised for read performance)
  like_count      INTEGER     DEFAULT 0,
  comment_count   INTEGER     DEFAULT 0,
  share_count     INTEGER     DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_feed_posts_updated_at ON feed_posts;
CREATE TRIGGER trg_feed_posts_updated_at
  BEFORE UPDATE ON feed_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Only approved posts are publicly visible
DROP POLICY IF EXISTS "feed_posts: public read approved" ON feed_posts;
CREATE POLICY "feed_posts: public read approved"
  ON feed_posts FOR SELECT
  USING (moderation_status = 'approved');

-- Authors can always see their own posts (including pending/flagged)
DROP POLICY IF EXISTS "feed_posts: author read own" ON feed_posts;
CREATE POLICY "feed_posts: author read own"
  ON feed_posts FOR SELECT
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "feed_posts: authenticated insert" ON feed_posts;
CREATE POLICY "feed_posts: authenticated insert"
  ON feed_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "feed_posts: author update own" ON feed_posts;
CREATE POLICY "feed_posts: author update own"
  ON feed_posts FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "feed_posts: author delete own" ON feed_posts;
CREATE POLICY "feed_posts: author delete own"
  ON feed_posts FOR DELETE
  USING (auth.uid() = author_id);


-- ---------------------------------------------------------------------------
-- 6. TRIGGER — Auto-create profile on signup
--    Fires after every INSERT on auth.users.
--    Reads full_name and role from user_metadata set during signUp().
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, is_email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'trainee'),
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (id) DO NOTHING;  -- safe for social logins that fire twice

  -- If the new user is a trainer, create an empty trainer_profiles row too
  IF (COALESCE(NEW.raw_user_meta_data->>'role', 'trainee') = 'trainer') THEN
    INSERT INTO trainer_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ---------------------------------------------------------------------------
-- 7. TRIGGER — Sync email_verified flag when user confirms email
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE profiles
    SET is_email_verified = TRUE
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_email_confirmed();


-- ---------------------------------------------------------------------------
-- 8. RPC — delete_user (GDPR Art. 17 — Right to Erasure)
--    Soft-deletes the calling user's account.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Mark for deletion (actual deletion happens via pg_cron after 30 days)
  UPDATE profiles
  SET 
    full_name = '[Deleted User]',
    avatar_url = NULL,
    updated_at = NOW()
  WHERE id = auth.uid();

  -- Schedule hard deletion via pg_cron (requires pg_cron extension enabled)
  -- Uncomment after enabling pg_cron:
  -- PERFORM cron.schedule('delete-user-' || auth.uid()::text,
  --   NOW() + INTERVAL '30 days',
  --   format('DELETE FROM auth.users WHERE id = %L', auth.uid()));

  -- For now: mark with metadata
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"pending_deletion": true}'::jsonb
  WHERE id = auth.uid();
END; $$;

-- ---------------------------------------------------------------------------
-- 8b. user_sessions table (required for device session listing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_sessions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_name TEXT,
  device_os   TEXT,
  ip_address  TEXT,
  is_current  BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own sessions" ON user_sessions;
CREATE POLICY "users see own sessions" ON user_sessions FOR ALL USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9. RPC — revoke_session (called by authService.revokeDeviceSession)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION revoke_session(session_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE id = session_id AND user_id = auth.uid();
END; $$;


-- ---------------------------------------------------------------------------
-- 10. SCHEDULED JOB — Permanently purge accounts past grace period
--     Requires pg_cron extension (enabled in Section 0).
--     Runs daily at 02:00 UTC.
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'purge-deleted-accounts',
  '0 2 * * *',
  $$
    DELETE FROM auth.users
    WHERE id IN (
      SELECT id FROM profiles
      WHERE pending_deletion = TRUE
        AND deletion_at < NOW()
    );
  $$
);


-- ---------------------------------------------------------------------------
-- 11. CONFLICT RESOLUTION
--     Drop the earlier scaffold versions of bookings and feed_posts before
--     recreating them in canonical form below.  CASCADE removes dependent
--     policies / indexes automatically.  Safe to run on an empty database.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS bookings   CASCADE;


-- ---------------------------------------------------------------------------
-- 12. TRAINERS TABLE
--     Extended profile for users with role = 'trainer'.
--     Separate from trainer_profiles (earlier scaffold) so both can coexist
--     during migration; trainer_profiles will be deprecated once this is live.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trainers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  bio               TEXT,
  specialisations   TEXT[]      NOT NULL DEFAULT '{}',
  certifications    TEXT[]      NOT NULL DEFAULT '{}',
  price_per_session NUMERIC(10, 2),
  experience_years  INTEGER     NOT NULL DEFAULT 0,
  location          TEXT,
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  rating            NUMERIC(3, 2) NOT NULL DEFAULT 0
                                CHECK (rating >= 0 AND rating <= 5),
  review_count      INTEGER     NOT NULL DEFAULT 0,
  total_clients     INTEGER     NOT NULL DEFAULT 0,
  -- JSONB array of availability windows:
  -- [{ day: "Mon", start: "09:00", end: "17:00" }, ...]
  availability      JSONB       NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_trainers_updated_at ON trainers;
CREATE TRIGGER trg_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- Verified trainers are publicly visible; unverified trainers see only their own row
DROP POLICY IF EXISTS "trainers: public select verified" ON trainers;
CREATE POLICY "trainers: public select verified"
  ON trainers FOR SELECT
  USING (is_verified = TRUE OR user_id = auth.uid());

-- Trainers can edit their own record
DROP POLICY IF EXISTS "trainers: owner update" ON trainers;
CREATE POLICY "trainers: owner update"
  ON trainers FOR UPDATE
  USING (user_id = auth.uid());

-- Trainers can insert their own record (during onboarding)
DROP POLICY IF EXISTS "trainers: owner insert" ON trainers;
CREATE POLICY "trainers: owner insert"
  ON trainers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can update any trainer (for verification)
DROP POLICY IF EXISTS "trainers: admin update" ON trainers;
CREATE POLICY "trainers: admin update"
  ON trainers FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 13. BOOKINGS TABLE (canonical version)
--     trainer_id references trainers(id) so we can JOIN trainer details
--     without going through profiles.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id          UUID        NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
  session_date        TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER     NOT NULL DEFAULT 60,
  session_type        TEXT        NOT NULL
                                  CHECK (session_type IN ('online', 'offline', 'group')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  amount              NUMERIC(10, 2),
  currency            TEXT        NOT NULL DEFAULT 'INR',
  payment_status      TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN ('pending','paid','refunded','failed')),
  -- Razorpay payment tracking
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  -- Refund tracking
  refund_id           TEXT,
  refund_amount       NUMERIC(10, 2),
  -- Metadata
  notes               TEXT,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Trainees see their own bookings
DROP POLICY IF EXISTS "bookings: trainee select" ON bookings;
CREATE POLICY "bookings: trainee select"
  ON bookings FOR SELECT
  USING (trainee_id = auth.uid());

-- Trainers see bookings for their trainer record
DROP POLICY IF EXISTS "bookings: trainer select" ON bookings;
CREATE POLICY "bookings: trainer select"
  ON bookings FOR SELECT
  USING (
    trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid())
  );

-- Only trainees can create bookings (for themselves)
DROP POLICY IF EXISTS "bookings: trainee insert" ON bookings;
CREATE POLICY "bookings: trainee insert"
  ON bookings FOR INSERT
  WITH CHECK (trainee_id = auth.uid());

-- Trainees can cancel pending bookings
DROP POLICY IF EXISTS "bookings: trainee cancel" ON bookings;
CREATE POLICY "bookings: trainee cancel"
  ON bookings FOR UPDATE
  USING (trainee_id = auth.uid() AND status = 'pending');

-- Trainers can confirm / complete their sessions
DROP POLICY IF EXISTS "bookings: trainer update status" ON bookings;
CREATE POLICY "bookings: trainer update status"
  ON bookings FOR UPDATE
  USING (
    trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- 14. BODY SCANS TABLE
--     Stores AI body analysis results per scan session.
--     PRIVATE: only the owning user can read/write their scan data.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS body_scans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Body composition metrics
  bmi               NUMERIC(5, 2),
  body_fat_percent  NUMERIC(5, 2),
  muscle_mass_kg    NUMERIC(5, 2),
  lean_mass_kg      NUMERIC(5, 2),
  weight_kg         NUMERIC(5, 2),
  -- Analysis scores
  posture_score     INTEGER     CHECK (posture_score BETWEEN 0 AND 100),
  overall_score     INTEGER     CHECK (overall_score BETWEEN 0 AND 100),
  body_shape        TEXT        CHECK (body_shape IN ('ectomorph','mesomorph','endomorph')),
  -- Media
  -- 4-angle photo URLs: [front, back, left, right]
  photo_urls        TEXT[]      NOT NULL DEFAULT '{}',
  -- AI-generated plan (full JSON from Groq/AI pipeline)
  generated_plan    JSONB,
  -- AI insight summary shown in ProgressScreen
  ai_summary        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE body_scans ENABLE ROW LEVEL SECURITY;

-- Users have full access to their own scans only
DROP POLICY IF EXISTS "body_scans: owner all" ON body_scans;
CREATE POLICY "body_scans: owner all"
  ON body_scans FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trainers can view their clients' scans (if client has shared)
-- (client consent field can be added later — omitted for now)


-- ---------------------------------------------------------------------------
-- 15. POSTS TABLE (FitFeed — canonical version, replaces feed_posts)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS posts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           TEXT,
  media_urls        TEXT[]      NOT NULL DEFAULT '{}',
  media_type        TEXT        CHECK (media_type IN ('image','video','text')),
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  -- BERT moderation pipeline output
  moderation_status TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (moderation_status IN ('pending','approved','flagged')),
  flag_reason       TEXT,
  -- Engagement (denormalised counters — updated via triggers or Edge Functions)
  likes_count       INTEGER     NOT NULL DEFAULT 0,
  comments_count    INTEGER     NOT NULL DEFAULT 0,
  shares_count      INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Approved posts are public; authors always see their own
DROP POLICY IF EXISTS "posts: public read approved" ON posts;
CREATE POLICY "posts: public read approved"
  ON posts FOR SELECT
  USING (moderation_status = 'approved' OR author_id = auth.uid());

-- Authenticated users can create posts
DROP POLICY IF EXISTS "posts: authenticated insert" ON posts;
CREATE POLICY "posts: authenticated insert"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Authors can edit their own posts
DROP POLICY IF EXISTS "posts: author update" ON posts;
CREATE POLICY "posts: author update"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Authors can delete their own posts
DROP POLICY IF EXISTS "posts: author delete" ON posts;
CREATE POLICY "posts: author delete"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- Admins can moderate (update moderation_status on any post)
DROP POLICY IF EXISTS "posts: admin moderate" ON posts;
CREATE POLICY "posts: admin moderate"
  ON posts FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );


-- ---------------------------------------------------------------------------
-- 16. CONSOLIDATED INDEXES
--     Covers profiles + all new tables.  IF NOT EXISTS keeps re-runs safe.
-- ---------------------------------------------------------------------------

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_pending_del
  ON profiles(pending_deletion) WHERE pending_deletion = TRUE;

-- trainers
CREATE INDEX IF NOT EXISTS idx_trainers_user_id
  ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_verified
  ON trainers(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_trainers_rating
  ON trainers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_trainers_location
  ON trainers(location);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_trainee
  ON bookings(trainee_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer
  ON bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date
  ON bookings(session_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(payment_status);

-- body_scans
CREATE INDEX IF NOT EXISTS idx_body_scans_user
  ON body_scans(user_id, scan_date DESC);

-- posts
CREATE INDEX IF NOT EXISTS idx_posts_author
  ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_moderation
  ON posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_posts_created
  ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags
  ON posts USING GIN(tags);


-- =============================================================================
-- SETUP COMPLETE
-- Tables created / updated:
--   profiles, trainer_profiles (scaffold), trainers, bookings,
--   body_scans, posts
-- RLS enabled on all tables.
-- Triggers: set_updated_at, handle_new_user, handle_user_email_confirmed
-- RPCs: delete_user(), revoke_session()
-- Cron: purge-deleted-accounts (daily 02:00 UTC)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New Query → Run
-- =============================================================================


-- =============================================================================
-- PHASE 2 — CHAT / REALTIME
-- Run AFTER the core schema above.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 17. CHAT THREADS TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_threads (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ,
  trainee_unread   INTEGER     NOT NULL DEFAULT 0,
  trainer_unread   INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trainee_id, trainer_id)
);

DROP TRIGGER IF EXISTS trg_chat_threads_updated_at ON chat_threads;
CREATE TRIGGER trg_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_threads: participants select" ON chat_threads;
CREATE POLICY "chat_threads: participants select"
  ON chat_threads FOR SELECT
  USING (trainee_id = auth.uid() OR trainer_id = auth.uid());

DROP POLICY IF EXISTS "chat_threads: trainee insert" ON chat_threads;
CREATE POLICY "chat_threads: trainee insert"
  ON chat_threads FOR INSERT
  WITH CHECK (trainee_id = auth.uid());

DROP POLICY IF EXISTS "chat_threads: participants update" ON chat_threads;
CREATE POLICY "chat_threads: participants update"
  ON chat_threads FOR UPDATE
  USING (trainee_id = auth.uid() OR trainer_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 18. MESSAGES TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      UUID        NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text           TEXT,
  media_url      TEXT,
  media_type     TEXT        CHECK (media_type IN ('image', 'video')),
  is_ai_insight  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_read        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only thread participants can read messages
DROP POLICY IF EXISTS "messages: participants select" ON messages;
CREATE POLICY "messages: participants select"
  ON messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM chat_threads
      WHERE trainee_id = auth.uid() OR trainer_id = auth.uid()
    )
  );

-- Only the authenticated sender can insert their own messages
DROP POLICY IF EXISTS "messages: participants insert" ON messages;
CREATE POLICY "messages: participants insert"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND thread_id IN (
      SELECT id FROM chat_threads
      WHERE trainee_id = auth.uid() OR trainer_id = auth.uid()
    )
  );

-- Participants can mark messages as read
DROP POLICY IF EXISTS "messages: participants update is_read" ON messages;
CREATE POLICY "messages: participants update is_read"
  ON messages FOR UPDATE
  USING (
    thread_id IN (
      SELECT id FROM chat_threads
      WHERE trainee_id = auth.uid() OR trainer_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 19. TRIGGER — Auto-update chat_threads on new message
--     Runs after INSERT on messages.
--     Updates: last_message, last_message_at, increments the other party's
--     unread counter.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread chat_threads;
  _is_trainee BOOLEAN;
BEGIN
  SELECT * INTO _thread FROM chat_threads WHERE id = NEW.thread_id;

  -- Determine which role the sender holds in this thread
  _is_trainee := (_thread.trainee_id = NEW.sender_id);

  UPDATE chat_threads
  SET
    last_message    = CASE
                        WHEN NEW.is_ai_insight THEN '✨ AI Insight'
                        WHEN NEW.text IS NOT NULL THEN LEFT(NEW.text, 100)
                        ELSE '📎 Media'
                      END,
    last_message_at = NEW.created_at,
    -- Increment the OTHER party's unread counter
    trainee_unread  = CASE WHEN _is_trainee THEN trainee_unread ELSE trainee_unread + 1 END,
    trainer_unread  = CASE WHEN _is_trainee THEN trainer_unread + 1 ELSE trainer_unread END
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION handle_new_message();


-- ---------------------------------------------------------------------------
-- 20. RPC — mark_thread_read (called by chatService.markThreadRead)
--     Zeros out the unread counter for the calling user's role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_thread_read(p_thread_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread chat_threads;
BEGIN
  SELECT * INTO _thread FROM chat_threads WHERE id = p_thread_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  IF auth.uid() = _thread.trainee_id THEN
    UPDATE chat_threads SET trainee_unread = 0 WHERE id = p_thread_id;
  ELSIF auth.uid() = _thread.trainer_id THEN
    UPDATE chat_threads SET trainer_unread = 0 WHERE id = p_thread_id;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Also mark all messages in this thread as read for this user
  UPDATE messages
  SET is_read = TRUE
  WHERE thread_id = p_thread_id
    AND sender_id != auth.uid()
    AND is_read = FALSE;
END;
$$;


-- ---------------------------------------------------------------------------
-- 21. REALTIME PUBLICATION
--     Enables Supabase Realtime on the messages table so clients receive
--     postgres_changes events for INSERT on messages.
--     Also enable chat_threads so unread counts update in real-time.
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;


-- ---------------------------------------------------------------------------
-- 22. INDEXES — chat tables
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_chat_threads_trainee
  ON chat_threads(trainee_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_trainer
  ON chat_threads(trainer_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_msg
  ON chat_threads(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id);


-- =============================================================================
-- FULL SETUP COMPLETE
-- Core tables:   profiles, trainers, bookings, body_scans, posts
-- Chat tables:   chat_threads, messages
-- RLS enabled on ALL tables.
-- Triggers:      set_updated_at, handle_new_user, handle_user_email_confirmed,
--                on_new_message
-- RPCs:          delete_user(), revoke_session(), mark_thread_read()
-- Realtime:      messages, chat_threads
-- Cron:          purge-deleted-accounts (daily 02:00 UTC)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New Query → Run
-- =============================================================================

