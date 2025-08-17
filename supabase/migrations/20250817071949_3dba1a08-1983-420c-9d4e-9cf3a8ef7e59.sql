-- Turn OFF maintenance mode (idempotent)
insert into public.runtime_flags (name, enabled)
values ('arena_v2_hard_disable', false)
on conflict (name) do update set enabled = excluded.enabled, updated_at = now();