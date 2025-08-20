-- --------------------------------------------
-- A) Keep revokes / grants as written
-- --------------------------------------------
DO $$
DECLARE rec RECORD;
BEGIN
  -- Revoke table perms from anon & PUBLIC
  FOR rec IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon',  rec.schemaname, rec.tablename);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC',rec.schemaname, rec.tablename);
  END LOOP;

  -- Revoke sequence perms from anon & PUBLIC
  FOR rec IN SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname='public' LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE %I.%I FROM anon',  rec.schemaname, rec.sequencename);
    EXECUTE format('REVOKE ALL ON SEQUENCE %I.%I FROM PUBLIC',rec.schemaname, rec.sequencename);
  END LOOP;
END$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- --------------------------------------------
-- B) RLS enable + least-privilege policies
--    (idempotent: drop if exists, then create)
-- --------------------------------------------

-- arena_friend_overtake_notifs
ALTER TABLE public.arena_friend_overtake_notifs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Clean conflicting policies if present
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='arena_friend_overtake_notifs' AND policyname='Users can view their own overtake notifications') THEN
    DROP POLICY "Users can view their own overtake notifications" ON public.arena_friend_overtake_notifs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='arena_friend_overtake_notifs' AND policyname='System can create overtake notifications') THEN
    DROP POLICY "System can create overtake notifications" ON public.arena_friend_overtake_notifs;
  END IF;

  -- Owner read/update/delete
  CREATE POLICY "overtake_owner_read"   ON public.arena_friend_overtake_notifs FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "overtake_owner_update" ON public.arena_friend_overtake_notifs FOR UPDATE TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "overtake_owner_delete" ON public.arena_friend_overtake_notifs FOR DELETE TO authenticated USING (user_id = auth.uid());

  -- Writes should be by system only (service_role)
  CREATE POLICY "overtake_system_insert" ON public.arena_friend_overtake_notifs FOR INSERT TO service_role WITH CHECK (true);
END$$;

-- arena_rollups_hist (historical/aggregate: read-only)
ALTER TABLE public.arena_rollups_hist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='arena_rollups_hist' AND policyname='Users can view arena history') THEN
    DROP POLICY "Users can view arena history" ON public.arena_rollups_hist;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='arena_rollups_hist' AND policyname='System can manage arena history') THEN
    DROP POLICY "System can manage arena history" ON public.arena_rollups_hist;
  END IF;

  CREATE POLICY "rollups_read_auth" ON public.arena_rollups_hist FOR SELECT TO authenticated USING (true);
  -- No INSERT/UPDATE/DELETE policies for authenticated; only service_role writes if needed:
  CREATE POLICY "rollups_system_write" ON public.arena_rollups_hist FOR ALL TO service_role USING (true) WITH CHECK (true);
END$$;

-- habit_nudges
ALTER TABLE public.habit_nudges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_nudges' AND policyname='Users can view their own habit nudges') THEN
    DROP POLICY "Users can view their own habit nudges" ON public.habit_nudges;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_nudges' AND policyname='Users can update their own habit nudges') THEN
    DROP POLICY "Users can update their own habit nudges" ON public.habit_nudges;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_nudges' AND policyname='System can create habit nudges') THEN
    DROP POLICY "System can create habit nudges" ON public.habit_nudges;
  END IF;

  CREATE POLICY "nudges_owner_read"   ON public.habit_nudges FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "nudges_owner_update" ON public.habit_nudges FOR UPDATE TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "nudges_owner_delete" ON public.habit_nudges FOR DELETE TO authenticated USING (user_id = auth.uid());

  CREATE POLICY "nudges_owner_insert"  ON public.habit_nudges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
END$$;

-- arena_ui_heartbeat (telemetry)
ALTER TABLE public.arena_ui_heartbeat ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='arena_ui_heartbeat' AND policyname='Authenticated users can create heartbeat entries') THEN
    DROP POLICY "Authenticated users can create heartbeat entries" ON public.arena_ui_heartbeat;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='arena_ui_heartbeat' AND policyname='No read access to heartbeat data') THEN
    DROP POLICY "No read access to heartbeat data" ON public.arena_ui_heartbeat;
  END IF;

  -- Insert allowed for authenticated (no read)
  CREATE POLICY "uihb_insert_auth" ON public.arena_ui_heartbeat FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "uihb_no_select"   ON public.arena_ui_heartbeat FOR SELECT   TO authenticated USING (false);
  -- Service role full control if needed
  CREATE POLICY "uihb_system_all"  ON public.arena_ui_heartbeat FOR ALL TO service_role USING (true) WITH CHECK (true);
END$$;

-- Backup tables: lock to owner only
REVOKE ALL ON public._backup_private_challenges_20250816 FROM authenticated;
REVOKE ALL ON public._backup_public_challenges_20250816   FROM authenticated;

-- --------------------------------------------
-- C) Extensions move (best effort; logs only)
-- --------------------------------------------
DO $$
DECLARE ext_name TEXT;
BEGIN
  FOR ext_name IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname='public' AND e.extname IN ('pg_net','pg_trgm')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_name);
      RAISE NOTICE 'Moved extension % to extensions schema', ext_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not move extension %: %', ext_name, SQLERRM;
    END;
  END LOOP;
END$$;

-- --------------------------------------------
-- D) Default privileges (future objects)
-- --------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;