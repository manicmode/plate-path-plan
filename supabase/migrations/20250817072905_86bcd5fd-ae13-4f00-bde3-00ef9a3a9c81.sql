-- Toggle flag ON for realtime test
insert into public.runtime_flags (name, enabled)
values ('arena_v2_hard_disable', true)
on conflict (name) do update set enabled = EXCLUDED.enabled, updated_at = now();