-- Grant access to arena_billboard view
GRANT SELECT ON TABLE public.arena_billboard TO authenticated;

-- Optional performance index for rollup filtering
CREATE INDEX IF NOT EXISTS idx_rollups_slice
  ON public.arena_leaderboard_rollups (section, year, month, rank);