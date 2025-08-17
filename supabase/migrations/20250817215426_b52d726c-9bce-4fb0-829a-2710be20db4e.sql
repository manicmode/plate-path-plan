BEGIN;

-- Lock membership to avoid concurrent writes during merge
LOCK TABLE public.rank20_members IN SHARE ROW EXCLUSIVE MODE;

-- Canonical group to KEEP
--   2086b73b-91a7-4467-ad8b-470411d0341b  -- Group A (Deborah)
-- Group to MERGE
--   e41bfb3e-0be5-43cb-b204-8695a5f66961  -- Group B (Ashkan + Ashi)

-- 1) Enforce one active membership per user (future-proof)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_rank20_active_membership
ON public.rank20_members(user_id)
WHERE removed_at IS NULL;

-- 2) Move active members from Group B into Group A
UPDATE public.rank20_members m
SET group_id = '2086b73b-91a7-4467-ad8b-470411d0341b'
WHERE m.group_id = 'e41bfb3e-0be5-43cb-b204-8695a5f66961'
  AND m.removed_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.rank20_members x
    WHERE x.user_id = m.user_id
      AND x.group_id = '2086b73b-91a7-4467-ad8b-470411d0341b'
      AND x.removed_at IS NULL
  );

-- 3) Assert capacity (not strictly needed here, but protects future runs)
DO $$
DECLARE v_active int;
BEGIN
  SELECT count(*) INTO v_active
  FROM public.rank20_members
  WHERE group_id = '2086b73b-91a7-4467-ad8b-470411d0341b'
    AND removed_at IS NULL;

  IF v_active > 20 THEN
    RAISE EXCEPTION 'Canonical group would exceed capacity (% > 20)', v_active;
  END IF;
END$$;

-- 4) Only delete Group B if truly empty and not referenced elsewhere
-- (Skip deletion now to avoid dangling refs; or do guarded delete.)
-- DELETE FROM public.rank20_groups
-- WHERE id = 'e41bfb3e-0be5-43cb-b204-8695a5f66961'
--   AND NOT EXISTS (SELECT 1 FROM public.rank20_members WHERE group_id = 'e41bfb3e-0be5-43cb-b204-8695a5f66961');

COMMIT;