-- Disable hard-disable (restore normal Arena)
insert into public.runtime_flags (name, enabled)
values ('arena_v2_hard_disable', false)
on conflict (name) do update set enabled = EXCLUDED.enabled, updated_at = now();