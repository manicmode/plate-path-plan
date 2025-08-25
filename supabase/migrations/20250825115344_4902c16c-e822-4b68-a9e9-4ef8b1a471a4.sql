-- Mark existing sessions as free (temporary)
UPDATE public.meditation_sessions
SET is_free = true
WHERE is_free IS DISTINCT FROM true;

-- Optional performance index
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_audio_path
  ON public.meditation_sessions (audio_path);

-- Verify the update worked
-- This will show in the query results after migration