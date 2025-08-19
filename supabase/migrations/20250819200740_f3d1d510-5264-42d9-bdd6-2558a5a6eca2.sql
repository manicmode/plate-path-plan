-- Drop the unsafe test function
DROP FUNCTION IF EXISTS public.test_pause_functionality();

-- Add updated_at column and trigger if missing (idempotent)
ALTER TABLE public.user_habit
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_user_habit_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_user_habit ON public.user_habit;
CREATE TRIGGER trg_touch_user_habit
BEFORE UPDATE ON public.user_habit
FOR EACH ROW EXECUTE FUNCTION public.touch_user_habit_updated_at();