-- Enable hard disable flag for testing
insert into public.runtime_flags (name, enabled)
values ('arena_v2_hard_disable', true)
on conflict (name) do update set enabled = excluded.enabled, updated_at = now();