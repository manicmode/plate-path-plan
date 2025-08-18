-- Add thin RPC wrapper for easier template seeding
create or replace function public.rpc_upsert_habit_templates(p_templates jsonb)
returns int
language sql
security definer
set search_path = public
as $$
  select public.habit_template_upsert_many(p_templates);
$$;