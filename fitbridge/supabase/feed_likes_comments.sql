CREATE TABLE IF NOT EXISTS post_likes (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id    UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "likes_select" ON post_likes FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id    UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_select" ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_delete" ON post_comments FOR DELETE USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION increment_likes(post_id UUID) RETURNS void AS $$
  UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = post_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID) RETURNS void AS $$
  UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id;
$$ LANGUAGE sql SECURITY DEFINER;
