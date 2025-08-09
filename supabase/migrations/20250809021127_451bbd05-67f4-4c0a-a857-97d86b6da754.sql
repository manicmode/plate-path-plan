-- Unique index to dedupe share cards per (owner_user_id, hash, size)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_share_cards_owner_hash_size
ON public.share_cards (owner_user_id, hash, size)
WHERE hash IS NOT NULL;

-- Trigger function to bump shares_count on user_profiles
CREATE OR REPLACE FUNCTION public.bump_shares_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    shares_count = COALESCE(shares_count, 0) + 1,
    updated_at = now()
  WHERE user_id = NEW.owner_user_id; -- user_profiles uses user_id as PK/unique identifier
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure latest function is used
DROP TRIGGER IF EXISTS trg_share_cards_increment ON public.share_cards;
CREATE TRIGGER trg_share_cards_increment
AFTER INSERT ON public.share_cards
FOR EACH ROW
EXECUTE FUNCTION public.bump_shares_count();