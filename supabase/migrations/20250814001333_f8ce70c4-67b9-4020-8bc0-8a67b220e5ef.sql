-- Ensure one Rank-of-20 challenge exists and is linked to a group
DO $$
DECLARE grp uuid; ch uuid;
BEGIN
  SELECT id, challenge_id INTO grp, ch FROM public.rank20_groups ORDER BY batch_number ASC LIMIT 1;
  IF grp IS NULL THEN
    INSERT INTO public.rank20_groups DEFAULT VALUES RETURNING id INTO grp;
  END IF;
  IF ch IS NULL THEN
    INSERT INTO public.private_challenges
      (title, description, creator_id, category, challenge_type, duration_days, start_date, max_participants, status)
    VALUES
      ('Rank of 20',
       'Auto-assigned 20-person live rankings group.',
       COALESCE(auth.uid(), (SELECT id FROM auth.users LIMIT 1)),
       'competition','rank_of_20',30, CURRENT_DATE, 20,'active')
    RETURNING id INTO ch;
    UPDATE public.rank20_groups SET challenge_id = ch WHERE id = grp;
  END IF;
END $$;

-- Normalize any existing row
UPDATE public.private_challenges
SET challenge_type = 'rank_of_20'
WHERE lower(title) = 'rank of 20' AND challenge_type <> 'rank_of_20';

-- Make sure current session user is in a Rank-of-20 group (no-op if already)
SELECT public.assign_rank20(auth.uid()) WHERE auth.uid() IS NOT NULL;

-- Confirm the RPC used by the dropdown exists and is callable
GRANT EXECUTE ON FUNCTION public.my_billboard_challenges() TO authenticated;