DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders'
      AND column_name='schedule' AND data_type='jsonb'
  ) THEN
    ALTER TABLE public.reminders
      ALTER COLUMN schedule TYPE text USING trim(both '"' from schedule::text);
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders'
      AND column_name='schedule'
  ) THEN
    ALTER TABLE public.reminders ADD COLUMN schedule text;
  END IF;
END $$;