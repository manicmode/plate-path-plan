BEGIN;

-- Keep the primary Arena challenge active, archive the bulk/backfill one
UPDATE private_challenges
SET status = 'archived'
WHERE id = '74b29c21-51f7-4c8c-8eab-03a42e51d9ac';  -- Rank of 20 Group (Bulk Backfill)

-- Sanity: show both rows after the change
SELECT id, COALESCE(title,'') AS label, status, start_date, duration_days
FROM private_challenges
WHERE id IN (
  '6b3e8b12-8ca7-4de7-8047-ae509647636e',  -- Arena — Rank of 20
  '74b29c21-51f7-4c8c-8eab-03a42e51d9ac'   -- Bulk Backfill
);

COMMIT;