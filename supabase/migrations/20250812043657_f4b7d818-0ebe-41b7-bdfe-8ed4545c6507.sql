begin;

-- Keep RLS enabled (good)
alter table public._backup_challenge_messages_orphans enable row level security;
alter table public.signup_error_logs enable row level security;

-- Allow inserts into signup_error_logs from app/trigger without opening reads
drop policy if exists "insert_logs" on public.signup_error_logs;
create policy "insert_logs"
  on public.signup_error_logs
  for insert
  with check (true);

-- (intentionally no SELECT policy -> logs remain non-readable to clients)

commit;