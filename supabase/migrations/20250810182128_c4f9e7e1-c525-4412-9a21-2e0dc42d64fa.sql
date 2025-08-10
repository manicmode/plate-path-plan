BEGIN;

-- 1) Columns: add if missing, and ensure safe defaults
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name  text,
  ADD COLUMN IF NOT EXISTS last_name   text,
  ADD COLUMN IF NOT EXISTS avatar_url  text,
  ADD COLUMN IF NOT EXISTS selected_trackers text[] DEFAULT ARRAY['calories','hydration','supplements'];

-- Make names non-null with empty default (avoids runtime null errors)
ALTER TABLE public.user_profiles
  ALTER COLUMN first_name SET DEFAULT '',
  ALTER COLUMN last_name  SET DEFAULT '';

UPDATE public.user_profiles
  SET first_name = COALESCE(first_name, ''),
      last_name  = COALESCE(last_name, '')
WHERE first_name IS NULL OR last_name IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name  SET NOT NULL;

-- Ensure selected_trackers is non-null with a default
UPDATE public.user_profiles
  SET selected_trackers = ARRAY['calories','hydration','supplements']
WHERE selected_trackers IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN selected_trackers SET NOT NULL,
  ALTER COLUMN selected_trackers SET DEFAULT ARRAY['calories','hydration','supplements'];

-- (Optional but recommended) created_at with default now()
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;

COMMIT;