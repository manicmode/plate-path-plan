begin;

-- 1) Ensure the ON CONFLICT targets actually exist
-- user_profiles needs a unique index on (user_id) for ON CONFLICT (user_id)
create unique index if not exists user_profiles_user_id_uidx
  on public.user_profiles (user_id);

-- user_roles needs a unique index on (user_id, role) for ON CONFLICT (user_id, role)
create unique index if not exists user_roles_user_id_role_uidx
  on public.user_roles (user_id, role);

-- 2) Replace the trigger function (SECURITY DEFINER so it bypasses RLS)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.user_profiles (
    user_id,
    selected_trackers,
    first_name,
    last_name,
    avatar_url
  )
  values (
    new.id,
    array['calories','hydration','supplements'],
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        last_name  = excluded.last_name,
        avatar_url = excluded.avatar_url;

  -- default role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end
$$;

-- 3) Recreate the trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

commit;