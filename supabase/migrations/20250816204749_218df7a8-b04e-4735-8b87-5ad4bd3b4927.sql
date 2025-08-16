BEGIN;

CREATE OR REPLACE FUNCTION public.my_rank20_active_challenge_id_fallback()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM private_challenges
  WHERE status = 'active'
    AND (
      title ILIKE '%rank%'
      OR COALESCE(challenge_type,'') ILIKE '%arena%'
      OR COALESCE(category,'')       ILIKE '%arena%'
    )
  ORDER BY start_date DESC NULLS LAST, created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_rank20_active_challenge_id_fallback() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.my_rank20_active_challenge_id_fallback() TO authenticated;

COMMIT;

-- (Optional) quick check:
SELECT public.my_rank20_active_challenge_id_fallback();