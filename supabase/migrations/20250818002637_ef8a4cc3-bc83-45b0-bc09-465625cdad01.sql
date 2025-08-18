-- Enable RLS and sane policies for per-user access on habit table
alter table public.habit enable row level security;

drop policy if exists p_habit_ins on public.habit;
create policy p_habit_ins on public.habit
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists p_habit_sel on public.habit;
create policy p_habit_sel on public.habit
for select to authenticated
using (user_id = auth.uid());

drop policy if exists p_habit_upd on public.habit;
create policy p_habit_upd on public.habit
for update to authenticated
using (user_id = auth.uid());

drop policy if exists p_habit_del on public.habit;
create policy p_habit_del on public.habit
for delete to authenticated
using (user_id = auth.uid());