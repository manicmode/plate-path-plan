-- Create user_follows table for follow relationships
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  followed_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, followed_user_id),
  CONSTRAINT no_self_follow CHECK (user_id != followed_user_id)
);

-- Enable RLS on user_follows table
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create policies for user_follows table
CREATE POLICY "Users can view their own follows and followers"
ON public.user_follows
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = followed_user_id);

CREATE POLICY "Users can create their own follows"
ON public.user_follows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
ON public.user_follows
FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_user_follows_user_id ON public.user_follows(user_id);
CREATE INDEX idx_user_follows_followed_user_id ON public.user_follows(followed_user_id);
CREATE INDEX idx_user_follows_created_at ON public.user_follows(created_at);

-- Add follower/following counts to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN followers_count integer DEFAULT 0,
ADD COLUMN following_count integer DEFAULT 0;

-- Create function to update follow counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for user
    UPDATE public.user_profiles 
    SET following_count = following_count + 1
    WHERE user_id = NEW.user_id;
    
    -- Increment followers count for followed user
    UPDATE public.user_profiles 
    SET followers_count = followers_count + 1
    WHERE user_id = NEW.followed_user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for user
    UPDATE public.user_profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.user_id;
    
    -- Decrement followers count for followed user
    UPDATE public.user_profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = OLD.followed_user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger to automatically update follow counts
CREATE TRIGGER update_follow_counts_trigger
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

-- Create function to get follow status
CREATE OR REPLACE FUNCTION public.get_follow_status(target_user_id uuid)
RETURNS TABLE(
  is_following boolean,
  is_followed_by boolean,
  followers_count integer,
  following_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM public.user_follows 
      WHERE user_id = current_user_id AND followed_user_id = target_user_id
    ) as is_following,
    EXISTS(
      SELECT 1 FROM public.user_follows 
      WHERE user_id = target_user_id AND followed_user_id = current_user_id
    ) as is_followed_by,
    COALESCE(up.followers_count, 0) as followers_count,
    COALESCE(up.following_count, 0) as following_count
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;
END;
$$;

-- Insert new social badges
INSERT INTO public.badges (name, title, description, icon, requirement_type, requirement_value, tracker_type, rarity) VALUES
('social_butterfly', 'Social Butterfly 🎯', 'Follow 10 friends to expand your network', '🎯', 'follow_count', 10, 'social', 'common'),
('loyal_follower', 'Loyal Follower 🫶', 'Stay following someone for 30 days', '🫶', 'follow_duration', 30, 'social', 'rare'),
('trend_starter', 'Trend Starter 🔥', 'Get followed by 10 users', '🔥', 'follower_count', 10, 'social', 'rare'),
('group_motivator', 'Group Motivator 🏆', '5 friends join your challenge via invite', '🏆', 'challenge_invites', 5, 'social', 'legendary');

-- Create function to check and award social badges
CREATE OR REPLACE FUNCTION public.check_social_badges(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_following_count integer;
  user_followers_count integer;
  badge_record RECORD;
BEGIN
  -- Get user's follow counts
  SELECT following_count, followers_count 
  INTO user_following_count, user_followers_count
  FROM public.user_profiles 
  WHERE user_id = target_user_id;
  
  -- Check Social Butterfly badge (following 10 users)
  IF user_following_count >= 10 THEN
    SELECT * INTO badge_record FROM public.badges WHERE name = 'social_butterfly';
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = target_user_id AND badge_id = badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id) 
      VALUES (target_user_id, badge_record.id);
    END IF;
  END IF;
  
  -- Check Trend Starter badge (10 followers)
  IF user_followers_count >= 10 THEN
    SELECT * INTO badge_record FROM public.badges WHERE name = 'trend_starter';
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = target_user_id AND badge_id = badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id) 
      VALUES (target_user_id, badge_record.id);
    END IF;
  END IF;
END;
$$;

-- Create trigger to check badges when follow counts change
CREATE OR REPLACE FUNCTION public.trigger_social_badge_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check badges for both users involved in the follow
    PERFORM public.check_social_badges(NEW.user_id);
    PERFORM public.check_social_badges(NEW.followed_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER social_badge_check_trigger
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_social_badge_check();