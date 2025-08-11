begin;

-- If an earlier wrong backup table exists (e.g., had 'username' column), drop it safely.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='_backup_challenge_messages_orphans'
  ) then
    -- If it doesn't match the live schema, recreate it properly
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='_backup_challenge_messages_orphans' and column_name='username'
    ) then
      drop table public._backup_challenge_messages_orphans;
    end if;
  end if;
end
$$;

-- Create a backup table that mirrors challenge_messages exactly
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='_backup_challenge_messages_orphans'
  ) then
    create table public._backup_challenge_messages_orphans (like public.challenge_messages including all);
  end if;
end
$$;

-- Detect if challenges table exists
do $$
declare
  challenges_exists boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='challenges'
  ) into challenges_exists;

  if challenges_exists then
    -- Backup orphans: non-UUIDs OR UUIDs not present in challenges
    with orphans as (
      select cm.*
      from public.challenge_messages cm
      left join public.challenges c
        on cm.challenge_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and c.id::text = cm.challenge_id
      where
            cm.challenge_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or (cm.challenge_id ~* '^[0-9a-f-]{36}$' and c.id is null)
    ),
    to_backup as (
      select o.*
      from orphans o
      left join public._backup_challenge_messages_orphans b on b.id = o.id
      where b.id is null
    )
    insert into public._backup_challenge_messages_orphans
    select * from to_backup;

    delete from public.challenge_messages cm
    using public._backup_challenge_messages_orphans b
    where cm.id = b.id;

  else
    -- No challenges table yet: backup & delete only non-UUID rows
    with orphans as (
      select cm.*
      from public.challenge_messages cm
      where cm.challenge_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    to_backup as (
      select o.*
      from orphans o
      left join public._backup_challenge_messages_orphans b on b.id = o.id
      where b.id is null
    )
    insert into public._backup_challenge_messages_orphans
    select * from to_backup;

    delete from public.challenge_messages cm
    using public._backup_challenge_messages_orphans b
    where cm.id = b.id;
  end if;
end
$$;

commit;