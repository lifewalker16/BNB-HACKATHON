-- ============================================================
-- Supabase Schema Migration Script for BNB-HACKATHON
-- ============================================================

-- Step 1: Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT NOT NULL DEFAULT 'anonymous',
  filename         TEXT NOT NULL,
  ats_score        NUMERIC(5,2),
  keyword_match    NUMERIC(5,2),
  missing_keywords JSONB DEFAULT '[]',
  analysis_result  JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);

-- Step 3: Create user_roadmaps table
CREATE TABLE IF NOT EXISTS user_roadmaps (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT NOT NULL DEFAULT 'anonymous',
  target_role      TEXT NOT NULL,
  timeline_days    INT NOT NULL,
  hours_per_week   INT DEFAULT 10,
  experience_level TEXT DEFAULT 'beginner',
  skills_gap       JSONB DEFAULT '[]',
  nodes            JSONB NOT NULL DEFAULT '[]',
  edges            JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON user_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_role    ON user_roadmaps(target_role);

-- Step 4: Create community_insights table
CREATE TABLE IF NOT EXISTS community_insights (
  id            BIGSERIAL PRIMARY KEY,
  role          TEXT NOT NULL,
  subreddit     TEXT NOT NULL,
  post_title    TEXT,
  post_url      TEXT,
  author        TEXT DEFAULT 'anonymous',
  upvotes       INT DEFAULT 0,
  chunk_content TEXT NOT NULL,
  embedding     vector(384) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_role ON community_insights(role);

-- Step 5: IVFFlat index reference (run after ingesting at least 100 rows in Task 08):
-- CREATE INDEX ON community_insights
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Step 6: Create vector similarity RPC function
CREATE OR REPLACE FUNCTION match_community_insights(
  query_embedding  vector(384),
  target_role      TEXT,
  match_threshold  FLOAT DEFAULT 0.5,
  match_count      INT   DEFAULT 10
)
RETURNS TABLE (
  id            BIGINT,
  role          TEXT,
  subreddit     TEXT,
  post_title    TEXT,
  post_url      TEXT,
  author        TEXT,
  upvotes       INT,
  chunk_content TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.role,
    ci.subreddit,
    ci.post_title,
    ci.post_url,
    ci.author,
    ci.upvotes,
    ci.chunk_content,
    (1 - (ci.embedding <=> query_embedding))::FLOAT AS similarity
  FROM community_insights ci
  WHERE ci.role ILIKE '%' || target_role || '%'
    AND (1 - (ci.embedding <=> query_embedding)) > match_threshold
  ORDER BY ci.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 7: Disable Row Level Security (RLS) for MVP
ALTER TABLE analyses          DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roadmaps     DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_insights DISABLE ROW LEVEL SECURITY;
