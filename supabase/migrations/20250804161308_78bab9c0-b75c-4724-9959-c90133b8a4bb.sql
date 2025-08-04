-- Create influencer_followers table
CREATE TABLE public.influencer_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(influencer_id, follower_id)
);

-- Enable RLS on influencer_followers
ALTER TABLE public.influencer_followers ENABLE ROW LEVEL SECURITY;

-- RLS policies for influencer_followers
CREATE POLICY "Users can follow/unfollow for themselves" 
ON public.influencer_followers 
FOR ALL 
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Influencers can view their followers" 
ON public.influencer_followers 
FOR SELECT 
USING (
  influencer_id IN (
    SELECT id FROM public.influencers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view follower counts"
ON public.influencer_followers 
FOR SELECT 
USING (true);

-- Add follower_only column to private_challenges
ALTER TABLE public.private_challenges 
ADD COLUMN follower_only BOOLEAN NOT NULL DEFAULT false;

-- Create follower_notifications_queue table
CREATE TABLE public.follower_notifications_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.private_challenges(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'new_challenge',
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on follower_notifications_queue
ALTER TABLE public.follower_notifications_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for follower_notifications_queue
CREATE POLICY "System can manage notifications" 
ON public.follower_notifications_queue 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own notifications" 
ON public.follower_notifications_queue 
FOR SELECT 
USING (auth.uid() = follower_id);

-- Add notification preferences to influencers table
ALTER TABLE public.influencers 
ADD COLUMN auto_notify_followers BOOLEAN NOT NULL DEFAULT true;

-- Function to queue notifications for new challenges
CREATE OR REPLACE FUNCTION public.queue_follower_notifications()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically queue notifications
CREATE TRIGGER trigger_queue_follower_notifications
AFTER UPDATE ON public.private_challenges
FOR EACH ROW
EXECUTE FUNCTION public.queue_follower_notifications();

-- Create indexes for performance
CREATE INDEX idx_influencer_followers_influencer_id ON public.influencer_followers(influencer_id);
CREATE INDEX idx_influencer_followers_follower_id ON public.influencer_followers(follower_id);
CREATE INDEX idx_follower_notifications_queue_sent ON public.follower_notifications_queue(sent) WHERE sent = false;