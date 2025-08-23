-- Add constraint to prevent future blank schedules
ALTER TABLE public.reminders
  ADD CONSTRAINT schedule_not_blank CHECK (btrim(schedule) <> '');

-- If any schedules are null, set a safe default and then apply NOT NULL
UPDATE public.reminders SET schedule = 'FREQ=DAILY' WHERE schedule IS NULL;

-- Apply NOT NULL constraint after remediation
ALTER TABLE public.reminders ALTER COLUMN schedule SET NOT NULL;