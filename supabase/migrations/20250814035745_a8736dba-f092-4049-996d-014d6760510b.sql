-- Self upsert policies (if not already created)
do $$
begin
  if not exists (select 1 from pg_policies where policyname='profiles_insert_self' and tablename='profiles' and schemaname='public') then
    create policy profiles_insert_self on public.profiles for insert with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where policyname='profiles_update_self' and tablename='profiles' and schemaname='public') then
    create policy profiles_update_self on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end$$;

-- Create or replace updated_at trigger function
create or replace function public._touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end$$;

-- Drop and recreate trigger to ensure it exists
drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
for each row execute function public._touch_updated_at();

-- Backfill profiles from auth (name → display_name, fallback to email handle)
insert into public.profiles (user_id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    initcap(regexp_replace(split_part(u.email,'@',1), '[._-]+', ' ', 'g'))
  ) as display_name,
  null
from auth.users u
on conflict (user_id) do update
set display_name = excluded.display_name
where public.profiles.display_name is null
   or public.profiles.display_name in ('Tom','Sally','Alex'); -- replace placeholders

-- Force the two test accounts by email patterns
update public.profiles p
set display_name = 'ashkan'
from auth.users u
where p.user_id = u.id and (
  u.email ilike '%ashkan%' or u.raw_user_meta_data->>'name' ilike '%ashkan%'
);

update public.profiles p
set display_name = 'debra'
from auth.users u
where p.user_id = u.id and (
  u.email ilike '%debra%' or u.raw_user_meta_data->>'name' ilike '%debra%'
);