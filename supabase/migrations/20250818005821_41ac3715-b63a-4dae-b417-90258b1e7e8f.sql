-- Enable RLS
alter table public.habit_search_synonyms enable row level security;

-- Clean up any prior policies
drop policy if exists "Anyone can view habit search synonyms" on public.habit_search_synonyms;
drop policy if exists "System can manage habit search synonyms" on public.habit_search_synonyms;
drop policy if exists habit_search_synonyms_ins on public.habit_search_synonyms;
drop policy if exists habit_search_synonyms_upd on public.habit_search_synonyms;
drop policy if exists habit_search_synonyms_del on public.habit_search_synonyms;

-- Read-only to everyone (public = anon + authenticated)
create policy "Anyone can view habit search synonyms"
on public.habit_search_synonyms
for select
to public
using (true);

-- Explicitly block writes for non-service roles
create policy habit_search_synonyms_ins
on public.habit_search_synonyms
for insert
to public
with check (false);

create policy habit_search_synonyms_upd
on public.habit_search_synonyms
for update
to public
using (false)
with check (false);

create policy habit_search_synonyms_del
on public.habit_search_synonyms
for delete
to public
using (false);