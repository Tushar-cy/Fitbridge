-- ============================================================
-- FitBridge — Supabase Setup Checklist (run AFTER schema.sql)
-- Paste each block in SQL Editor → New Query → Run
-- ============================================================

-- 1. Allow public read of verified trainers (Explore screen works without login)
DO $$ BEGIN
  CREATE POLICY "trainers: public read verified"
    ON trainers FOR SELECT USING (is_verified = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Allow public read of approved posts (FitFeed works without login)
DO $$ BEGIN
  CREATE POLICY "posts: public read approved"
    ON posts FOR SELECT USING (moderation_status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Allow authenticated users to insert their own posts
DO $$ BEGIN
  CREATE POLICY "posts: authenticated insert"
    ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Allow users to read their own bookings
DO $$ BEGIN
  CREATE POLICY "bookings: trainee read own"
    ON bookings FOR SELECT USING (auth.uid() = trainee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Allow users to insert bookings
DO $$ BEGIN
  CREATE POLICY "bookings: trainee insert"
    ON bookings FOR INSERT WITH CHECK (auth.uid() = trainee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Allow users to read their own body scans
DO $$ BEGIN
  CREATE POLICY "body_scans: owner read"
    ON body_scans FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Allow users to insert their own body scans
DO $$ BEGIN
  CREATE POLICY "body_scans: owner insert"
    ON body_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Seed 3 demo trainers (so Explore screen shows real data immediately)
-- Only insert if table is empty
INSERT INTO profiles (id, full_name, avatar_url, role)
SELECT gen_random_uuid(), 'Riya Sharma', 'https://randomuser.me/api/portraits/women/44.jpg', 'trainer'
WHERE NOT EXISTS (SELECT 1 FROM trainers LIMIT 1);

-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
