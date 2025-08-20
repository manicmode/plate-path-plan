-- 1) Realtime needs full row images
ALTER TABLE public.user_habit REPLICA IDENTITY FULL;

-- 2) Clean dupes (keep newest per user+slug)
WITH dups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, slug
      ORDER BY COALESCE(created_at, updated_at, now()) DESC NULLS LAST
    ) AS rn
  FROM public.user_habit
)
DELETE FROM public.user_habit uh
USING dups
WHERE uh.id = dups.id
  AND dups.rn > 1;

-- 3) Unique guard (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_habit_user_slug_uniq'
  ) THEN
    ALTER TABLE public.user_habit
    ADD CONSTRAINT user_habit_user_slug_uniq
    UNIQUE (user_id, slug);
  END IF;
END$$;

-- 4) Read-your-own rows (needed for Realtime + UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'user_habit'
      AND policyname = 'read_own_user_habit'
  ) THEN
    CREATE POLICY "read_own_user_habit"
    ON public.user_habit
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- 5) Add an index to help the Active Habits view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_user_habit_user_slug'
  ) THEN
    CREATE INDEX idx_user_habit_user_slug
      ON public.user_habit (user_id, slug);
  END IF;
END$$;