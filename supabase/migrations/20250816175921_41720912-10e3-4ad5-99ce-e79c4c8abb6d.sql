-- Create table (idempotent)
CREATE TABLE IF NOT EXISTS arena_ui_heartbeat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

-- Add a simple index for recency queries
CREATE INDEX IF NOT EXISTS idx_arena_ui_heartbeat_at ON arena_ui_heartbeat(at DESC);