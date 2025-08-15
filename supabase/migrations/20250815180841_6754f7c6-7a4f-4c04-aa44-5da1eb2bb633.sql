-- Authenticated Arena Chat Health Check Script
-- This will run all validations and report results

-- Simulate an authenticated session for this SQL editor tab
SET LOCAL ROLE authenticated;

-- Pick a real user: prefer a user already in rank20_members, else newest auth user
WITH prefer AS (
  SELECT rm.user_id
  FROM public.rank20_members rm
  ORDER BY rm.joined_at DESC
  LIMIT 1
), fallback AS (
  SELECT u.id AS user_id
  FROM auth.users u
  ORDER BY u.created_at DESC
  LIMIT 1
), chosen AS (
  SELECT COALESCE((SELECT user_id FROM prefer),
                  (SELECT user_id FROM fallback)) AS user_id
)
SELECT set_config('request.jwt.claim.sub', (SELECT user_id::text FROM chosen), true) AS jwt_user_applied;

-- 1) Functions: owner + volatility
DO $$
BEGIN
  RAISE NOTICE '=== STEP 1: Function Properties ===';
END $$;

SELECT proname, pg_get_userbyid(proowner) AS owner, provolatile
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('ensure_rank20_membership','arena_post_message','my_rank20_chosen_challenge_id');

-- 2) Auto-enroll (must return exactly one row)
DO $$
BEGIN
  RAISE NOTICE '=== STEP 2: Auto-enrollment ===';
END $$;

SELECT * FROM public.ensure_rank20_membership();

-- 3) Challenge resolver (must match #2 and include member_count)
DO $$
BEGIN
  RAISE NOTICE '=== STEP 3: Challenge Resolution ===';
END $$;

SELECT * FROM public.my_rank20_chosen_challenge_id();

-- 4) Send a message (should succeed; on failure, message includes SQLSTATE)
DO $$
BEGIN
  RAISE NOTICE '=== STEP 4: Message Send ===';
END $$;

SELECT public.arena_post_message('instrumented healthcheck ✅ ' || now()::text) AS new_message_id;

-- 5) Verify message is stored under my challenge
DO $$
BEGIN
  RAISE NOTICE '=== STEP 5: Message Storage Verification ===';
END $$;

SELECT id, left(body, 80) AS body, created_at
FROM public.rank20_chat_messages
WHERE challenge_id = (
  SELECT rg.challenge_id
  FROM public.rank20_groups rg
  JOIN public.rank20_members rm ON rm.group_id = rg.id
  WHERE rm.user_id = current_setting('request.jwt.claim.sub')::uuid
  LIMIT 1
)
ORDER BY created_at DESC
LIMIT 5;

-- 6) PCP row exists for me (idempotent)
DO $$
BEGIN
  RAISE NOTICE '=== STEP 6: PCP Row Verification ===';
END $$;

SELECT private_challenge_id, user_id, created_at
FROM public.private_challenge_participations
WHERE user_id = current_setting('request.jwt.claim.sub')::uuid
ORDER BY created_at DESC
LIMIT 5;

-- 7) Security sanity – anon cannot execute (should all be false)
DO $$
BEGIN
  RAISE NOTICE '=== STEP 7: Security Check ===';
END $$;

SELECT
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('ensure_rank20_membership','arena_post_message','my_rank20_chosen_challenge_id');