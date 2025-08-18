-- Coach copy tone support (idempotent)
alter table public.habit_template
  add column if not exists coach_tones jsonb;  -- { gentle:{reminder_line,...}, hype:{...} }

-- Quick sanity
select column_name
from information_schema.columns
where table_schema='public' and table_name='habit_template' and column_name='coach_tones';