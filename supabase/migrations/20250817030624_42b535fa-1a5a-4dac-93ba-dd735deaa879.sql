-- Add unique constraint and performance indexes for arena
CREATE UNIQUE INDEX IF NOT EXISTS pcp_unique
  ON private_challenge_participations (private_challenge_id, user_id);

CREATE INDEX IF NOT EXISTS ae_ch_user 
  ON arena_events (challenge_id, user_id);