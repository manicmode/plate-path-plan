-- Create mood check-in preferences table
CREATE TABLE public.mood_checkin_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  reminder_time_local text NOT NULL DEFAULT '20:30',
  timezone text NOT NULL DEFAULT 'UTC',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create mood check-in sends tracking table
CREATE TABLE public.mood_checkin_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_key)
);

-- Add foreign key constraints with cascade delete
ALTER TABLE public.mood_checkin_prefs
  ADD CONSTRAINT mood_checkin_prefs_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mood_checkin_sends
  ADD CONSTRAINT mood_checkin_sends_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.mood_checkin_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkin_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies for mood_checkin_prefs
CREATE POLICY "Users can view their own mood checkin preferences"
ON public.mood_checkin_prefs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mood checkin preferences"
ON public.mood_checkin_prefs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood checkin preferences"
ON public.mood_checkin_prefs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS policies for mood_checkin_sends
CREATE POLICY "Users can view their own mood reminder sends"
ON public.mood_checkin_sends
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service can write mood reminder sends"
ON public.mood_checkin_sends
FOR ALL
TO authenticated
USING (
  current_setting('request.jwt.claims', true)::jsonb ? 'role'
  AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
)
WITH CHECK (
  current_setting('request.jwt.claims', true)::jsonb ? 'role'
  AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Create or update the touch_updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Create trigger for updated_at on mood_checkin_prefs
CREATE TRIGGER update_mood_checkin_prefs_updated_at
BEFORE UPDATE ON public.mood_checkin_prefs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Create helper function to ensure mood prefs exist
CREATE OR REPLACE FUNCTION public.ensure_mood_prefs(p_user uuid, p_tz text, p_time text DEFAULT '20:30')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mood_checkin_prefs (user_id, timezone, reminder_time_local, enabled)
  VALUES (p_user, COALESCE(p_tz,'UTC'), COALESCE(p_time,'20:30'), true)
  ON CONFLICT (user_id) DO UPDATE
    SET timezone = EXCLUDED.timezone,
        reminder_time_local = EXCLUDED.reminder_time_local,
        updated_at = now();
END $$;

-- Grant permissions for the helper function
GRANT EXECUTE ON FUNCTION public.ensure_mood_prefs(uuid, text, text) TO authenticated;

-- Create indexes for performance
CREATE INDEX idx_mood_checkin_prefs_user_id ON public.mood_checkin_prefs(user_id);
CREATE INDEX idx_mood_checkin_prefs_enabled ON public.mood_checkin_prefs(enabled) WHERE enabled = true;
CREATE INDEX idx_mood_checkin_sends_user_date ON public.mood_checkin_sends(user_id, date_key);
CREATE INDEX idx_mood_checkin_sends_date_key ON public.mood_checkin_sends(date_key);