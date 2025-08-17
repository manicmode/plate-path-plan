-- Add performance indexes for arena_leaderboard_rollups
CREATE INDEX IF NOT EXISTS idx_arena_rollups_ym 
  ON public.arena_leaderboard_rollups (year, month) INCLUDE (user_id, score, section);

-- Index for section-specific queries  
CREATE INDEX IF NOT EXISTS idx_arena_rollups_ym_section 
  ON public.arena_leaderboard_rollups (year, month, section) INCLUDE (user_id, score);