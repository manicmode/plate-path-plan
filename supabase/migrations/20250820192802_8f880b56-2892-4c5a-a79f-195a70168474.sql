-- Fix specific table privileges to match intended access patterns

-- arena_rollups_hist: should be SELECT-only for authenticated (no UPDATE/DELETE/INSERT)
REVOKE INSERT, UPDATE, DELETE ON public.arena_rollups_hist FROM authenticated;
GRANT SELECT ON public.arena_rollups_hist TO authenticated;

-- arena_ui_heartbeat: should be INSERT-only for authenticated (no SELECT/UPDATE/DELETE)  
REVOKE SELECT, UPDATE, DELETE ON public.arena_ui_heartbeat FROM authenticated;
GRANT INSERT ON public.arena_ui_heartbeat TO authenticated;