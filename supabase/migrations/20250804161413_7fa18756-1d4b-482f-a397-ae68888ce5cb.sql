-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.queue_follower_notifications()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  -- Only queue notifications for public challenges when they become active
  IF NEW.status = 'active' AND NEW.follower_only = false AND OLD.status != 'active' THEN
    INSERT INTO public.follower_notifications_queue (
      influencer_id,
      follower_id,
      challenge_id,
      notification_type
    )
    SELECT 
      i.id,
      if_table.follower_id,
      NEW.id,
      'new_challenge'
    FROM public.influencers i
    JOIN public.influencer_followers if_table ON if_table.influencer_id = i.id
    WHERE i.user_id = NEW.creator_id 
      AND i.auto_notify_followers = true;
  END IF;
  
  RETURN NEW;
END;
$$;