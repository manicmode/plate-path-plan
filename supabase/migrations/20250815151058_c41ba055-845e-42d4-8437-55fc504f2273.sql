create or replace function public.my_rank20_members()
returns table(user_id uuid, group_id uuid, display_name text, avatar_url text, joined_at timestamptz)
language sql security definer set search_path=public,pg_catalog as $$
  select rm.user_id, rm.group_id, 
         coalesce(up.first_name || ' ' || up.last_name, 'Unknown') as display_name,
         up.avatar_url,
         rm.joined_at
  from public.rank20_members rm
  left join public.user_profiles up on up.user_id = rm.user_id
  where rm.group_id = (
    select group_id from public.rank20_members where user_id = auth.uid() limit 1
  );
$$;