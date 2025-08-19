BEGIN;

-- 1) One reminder per user per habit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='uniq_habit_reminders_user_template'
  ) THEN
    ALTER TABLE public.habit_reminders
    ADD CONSTRAINT uniq_habit_reminders_user_template
    UNIQUE (user_id, template_id);
  END IF;
END $$;

-- 2) Enforce user's single enrollment per habit (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='uniq_user_habit_user_template'
  ) THEN
    ALTER TABLE public.user_habit
    ADD CONSTRAINT uniq_user_habit_user_template
    UNIQUE (user_id, template_id);
  END IF;
END $$;

-- 3) Tie reminders to templates (FK), cascade on delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema='public' AND table_name='habit_reminders'
      AND constraint_name='fk_habit_reminders_template'
  ) THEN
    ALTER TABLE public.habit_reminders
    ADD CONSTRAINT fk_habit_reminders_template
    FOREIGN KEY (template_id) REFERENCES public.habit_template(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;