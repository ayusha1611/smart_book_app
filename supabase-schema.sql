-- ================================================================
-- RUN THIS ENTIRE BLOCK IN SUPABASE SQL EDITOR → NEW QUERY
-- ================================================================

-- STEP 1: Create table (IF NOT EXISTS is safe to re-run)
CREATE TABLE IF NOT EXISTS bookmarks (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STEP 2: Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- STEP 3: Drop old policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "insert_own_bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "delete_own_bookmarks" ON bookmarks;

-- STEP 4: Create RLS policies
CREATE POLICY "select_own_bookmarks"
  ON bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_bookmarks"
  ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_bookmarks"
  ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- STEP 5: CRITICAL — full row in DELETE payloads (required for realtime DELETE events)
ALTER TABLE bookmarks REPLICA IDENTITY FULL;

-- STEP 6: Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;

-- ================================================================
-- VERIFY: Run this separately to confirm realtime is set up:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- You should see "bookmarks" in the results.
-- ================================================================
