-- ============================================================
-- Smart Memory System — run this in the Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector (requires Supabase project with pgvector enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. game_memories table
--    embedding dimension = 384  (Xenova/all-MiniLM-L6-v2, local ONNX)
CREATE TABLE IF NOT EXISTS public.game_memories (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  save_slot_id  UUID        NOT NULL REFERENCES public.save_slots(id) ON DELETE CASCADE,
  memory_text   TEXT        NOT NULL,
  embedding     vector(384),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. IVFFlat index for fast approximate cosine-similarity search.
--    (ivfflat works well once you have > ~1000 rows; for small tables a plain
--    sequential scan is fine and Postgres will use it automatically anyway.)
CREATE INDEX IF NOT EXISTS game_memories_embedding_idx
  ON public.game_memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Row Level Security — users can only touch memories that belong to
--    save slots they own.
ALTER TABLE public.game_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memories"
  ON public.game_memories
  FOR ALL
  USING (
    save_slot_id IN (
      SELECT id FROM public.save_slots WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    save_slot_id IN (
      SELECT id FROM public.save_slots WHERE user_id = auth.uid()
    )
  );

-- 5. match_memories — cosine similarity search scoped to one save slot.
--    Returns rows where similarity > similarity_threshold, ordered by
--    relevance, limited to match_count results.
--
--    Call from client:
--      supabase.rpc('match_memories', {
--        p_save_slot_id: '<uuid>',
--        query_embedding: [0.1, 0.2, ...],   -- 1536 floats
--        match_count: 3,
--        similarity_threshold: 0.4
--      })
CREATE OR REPLACE FUNCTION public.match_memories(
  p_save_slot_id      UUID,
  query_embedding     vector(384),
  match_count         INT   DEFAULT 3,
  similarity_threshold FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id           UUID,
  memory_text  TEXT,
  similarity   FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    gm.id,
    gm.memory_text,
    1 - (gm.embedding <=> query_embedding) AS similarity
  FROM  public.game_memories gm
  WHERE gm.save_slot_id = p_save_slot_id
    AND 1 - (gm.embedding <=> query_embedding) > similarity_threshold
  ORDER BY gm.embedding <=> query_embedding
  LIMIT match_count;
$$;
