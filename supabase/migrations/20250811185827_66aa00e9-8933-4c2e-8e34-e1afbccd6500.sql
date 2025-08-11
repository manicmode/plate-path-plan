begin;

-- 0) Temporarily disable RLS on the table to avoid policy dependencies during DDL
alter table public.challenge_messages disable row level security;

-- 1) Drop ALL existing policies on challenge_messages (names may vary)
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'challenge_messages'
  loop
    execute format('drop policy if exists %I on public.challenge_messages', pol.policyname);
  end loop;
end
$$;

-- 2) Convert challenge_id text -> uuid (idempotent; assumes orphans already cleaned)
do $$
declare
  coltype text;
  bad_rows int;
begin
  select data_type into coltype
  from information_schema.columns
  where table_schema='public' and table_name='challenge_messages' and column_name='challenge_id';

  if coltype = 'text' then
    -- Add tmp column
    alter table public.challenge_messages add column if not exists challenge_id_tmp uuid;

    -- Directly cast UUID-looking values
    update public.challenge_messages cm
    set challenge_id_tmp = case
      when cm.challenge_id ~ '^[0-9a-fA-F-]{36}$' then cm.challenge_id::uuid
      else null
    end
    where challenge_id_tmp is null;

    -- Map text ids to challenges.id if they match text form
    update public.challenge_messages cm
    set challenge_id_tmp = c.id
    from public.challenges c
    where cm.challenge_id_tmp is null
      and cm.challenge_id = c.id::text;

    -- Validate all rows mapped
    select count(*) into bad_rows
    from public.challenge_messages
    where challenge_id_tmp is null;

    if bad_rows > 0 then
      raise exception 'Migration aborted: % challenge_messages rows cannot be mapped to a UUID. Example rows: %',
        bad_rows,
        (select json_agg(t) from (
          select id, challenge_id from public.challenge_messages
          where challenge_id_tmp is null
          limit 5
        ) t);
    end if;

    -- Drop existing FKs defensively
    do $f$
    declare
      con record;
    begin
      for con in
        select conname
        from pg_constraint
        where conrelid = 'public.challenge_messages'::regclass
          and contype = 'f'
      loop
        execute format('alter table public.challenge_messages drop constraint %I', con.conname);
      end loop;
    end
    $f$;

    -- Replace the column
    alter table public.challenge_messages drop column challenge_id;
    alter table public.challenge_messages rename column challenge_id_tmp to challenge_id;

    -- Re-add FK + not null
    alter table public.challenge_messages
      alter column challenge_id set not null,
      add constraint challenge_messages_challenge_id_fkey
        foreign key (challenge_id) references public.challenges(id) on delete cascade;

    -- Ensure user_id FK exists
    do $f$
    begin
      if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.challenge_messages'::regclass
          and conname = 'challenge_messages_user_id_fkey'
      ) then
        alter table public.challenge_messages
          add constraint challenge_messages_user_id_fkey
          foreign key (user_id) references auth.users(id) on delete cascade;
      end if;
    end
    $f$;

  end if;
end
$$;

-- 3) Re-enable RLS and recreate standard policies
alter table public.challenge_messages enable row level security;

create policy read_challenge_messages
on public.challenge_messages for select to authenticated
using (
  exists (
    select 1 from public.challenge_members m
    where m.challenge_id = challenge_messages.challenge_id
      and m.user_id = auth.uid()
      and m.status = 'joined'
  )
  or exists (
    select 1 from public.challenges c
    where c.id = challenge_messages.challenge_id
      and c.owner_user_id = auth.uid()
  )
);

create policy post_challenge_messages
on public.challenge_messages for insert to authenticated
with check (
  exists (
    select 1 from public.challenge_members m
    where m.challenge_id = challenge_messages.challenge_id
      and m.user_id = auth.uid()
      and m.status = 'joined'
  )
  or exists (
    select 1 from public.challenges c
    where c.id = challenge_messages.challenge_id
      and c.owner_user_id = auth.uid()
  )
);

commit;