-- ============================================================
-- FitBridge — COMPLETE SETUP SQL
-- Run this ONCE in: supabase.com → project aawrgizwblaajotvepww
-- → SQL Editor → New query → paste everything below → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name         TEXT        NOT NULL DEFAULT '',
  avatar_url        TEXT,
  role              TEXT        NOT NULL DEFAULT 'trainee'
                                CHECK (role IN ('trainee','trainer','org','brand','admin')),
  phone             TEXT,
  bio               TEXT,
  height_cm         NUMERIC,
  weight_kg         NUMERIC,
  age               INTEGER,
  gender            TEXT        CHECK (gender IN ('male','female','other')),
  fitness_goal      TEXT,
  is_email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  subscription_tier TEXT        NOT NULL DEFAULT 'free'
                                CHECK (subscription_tier IN ('free','premium')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles: owner select"  ON profiles;
DROP POLICY IF EXISTS "profiles: owner update"  ON profiles;
DROP POLICY IF EXISTS "profiles: owner insert"  ON profiles;
CREATE POLICY "profiles: owner select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: owner update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles: owner insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'trainee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. TRAINERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL DEFAULT '',
  bio              TEXT,
  avatar_url       TEXT,
  specialisation   TEXT[]      DEFAULT '{}',
  certifications   TEXT[]      DEFAULT '{}',
  location         TEXT        DEFAULT '',
  price_per_session NUMERIC    DEFAULT 0,
  rating           NUMERIC     DEFAULT 0,
  review_count     INTEGER     DEFAULT 0,
  is_verified      BOOLEAN     DEFAULT FALSE,
  tags             TEXT[]      DEFAULT '{}',
  available_modes  TEXT[]      DEFAULT '{"online"}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trainers: public read" ON trainers;
DROP POLICY IF EXISTS "trainers: owner manage" ON trainers;
CREATE POLICY "trainers: public read"   ON trainers FOR SELECT USING (true);
CREATE POLICY "trainers: owner manage"  ON trainers FOR ALL   USING (auth.uid() = profile_id);

-- ── 3. POSTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  content           TEXT        DEFAULT '',
  image_urls        TEXT[]      DEFAULT '{}',
  video_url         TEXT,
  media_type        TEXT        DEFAULT 'text' CHECK (media_type IN ('image','video','text')),
  tags              TEXT[]      DEFAULT '{}',
  likes_count       INTEGER     DEFAULT 0,
  comments_count    INTEGER     DEFAULT 0,
  moderation_status TEXT        DEFAULT 'approved' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts: public read approved"   ON posts;
DROP POLICY IF EXISTS "posts: authenticated insert"   ON posts;
DROP POLICY IF EXISTS "posts: owner manage"           ON posts;
CREATE POLICY "posts: public read approved" ON posts FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "posts: authenticated insert" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts: owner manage"         ON posts FOR ALL   USING (auth.uid() = author_id);

-- ── 4. BOOKINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id   UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id   UUID        REFERENCES trainers(id) ON DELETE CASCADE,
  session_date DATE        NOT NULL,
  session_time TIME        NOT NULL,
  duration_min INTEGER     DEFAULT 60,
  mode         TEXT        DEFAULT 'online' CHECK (mode IN ('online','in-person')),
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  amount       NUMERIC     DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings: trainee read" ON bookings;
DROP POLICY IF EXISTS "bookings: trainer read" ON bookings;
DROP POLICY IF EXISTS "bookings: trainee insert" ON bookings;
CREATE POLICY "bookings: trainee read"   ON bookings FOR SELECT USING (auth.uid() = trainee_id);
CREATE POLICY "bookings: trainer read"   ON bookings FOR SELECT USING (
  auth.uid() IN (SELECT profile_id FROM trainers WHERE id = trainer_id)
);
CREATE POLICY "bookings: trainee insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = trainee_id);

-- ── 5. BODY SCANS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_scans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  bmi             NUMERIC,
  body_fat_pct    NUMERIC,
  muscle_mass_kg  NUMERIC,
  lean_mass_kg    NUMERIC,
  posture_score   INTEGER,
  overall_score   INTEGER,
  body_shape      TEXT,
  photo_urls      TEXT[]      DEFAULT '{}',
  generated_plan  JSONB,
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE body_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scans: owner read"   ON body_scans;
DROP POLICY IF EXISTS "scans: owner insert" ON body_scans;
CREATE POLICY "scans: owner read"   ON body_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scans: owner insert" ON body_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 6. CHAT THREADS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_threads (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id       UUID        REFERENCES profiles(id),
  trainer_id       UUID        REFERENCES profiles(id),
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ,
  trainee_unread   INTEGER     DEFAULT 0,
  trainer_unread   INTEGER     DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainee_id, trainer_id)
);
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "threads: participants" ON chat_threads;
CREATE POLICY "threads: participants" ON chat_threads FOR ALL
  USING (auth.uid() = trainee_id OR auth.uid() = trainer_id);

-- ── 7. MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID        REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id     UUID        REFERENCES profiles(id),
  text          TEXT,
  media_url     TEXT,
  media_type    TEXT        CHECK (media_type IN ('image','video')),
  is_ai_insight BOOLEAN     DEFAULT FALSE,
  is_read       BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages: participants" ON messages;
CREATE POLICY "messages: participants" ON messages FOR ALL
  USING (
    auth.uid() IN (
      SELECT trainee_id FROM chat_threads WHERE id = thread_id
      UNION
      SELECT trainer_id FROM chat_threads WHERE id = thread_id
    )
  );

-- ── 8. SEED 2 DEMO TRAINERS (shows real data in Explore) ──────
-- Only runs if trainers table is empty
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM trainers LIMIT 1) THEN
    INSERT INTO trainers (name, bio, avatar_url, specialisation, location, price_per_session, rating, review_count, is_verified, tags)
    VALUES
      ('Priya Sharma',  'Certified yoga & nutrition coach with 8 years experience. Helped 200+ clients reach their fitness goals.',
       'https://randomuser.me/api/portraits/women/44.jpg', ARRAY['Yoga','Nutrition','Flexibility'],
       'Mumbai', 1500, 4.9, 87, true, ARRAY['online','in-person','beginner-friendly']),
      ('Arjun Mehta',   'Ex-national level weightlifter. Specialises in muscle building and athletic performance.',
       'https://randomuser.me/api/portraits/men/32.jpg', ARRAY['Strength Training','HIIT','Calisthenics'],
       'Delhi', 2000, 4.7, 124, true, ARRAY['online','advanced','sports']),
      ('Sneha Kapoor',  'HIIT & Zumba specialist. Fun, high-energy sessions for weight loss and cardio fitness.',
       'https://randomuser.me/api/portraits/women/68.jpg', ARRAY['Zumba','HIIT','Weight Loss'],
       'Bangalore', 1200, 4.8, 63, true, ARRAY['online','beginner-friendly','group']);
  END IF;
END $$;

-- ── Verify setup ──────────────────────────────────────────────
SELECT table_name, (SELECT count(*) FROM information_schema.columns c2 WHERE c2.table_name = t.table_name AND c2.table_schema = 'public') as col_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
