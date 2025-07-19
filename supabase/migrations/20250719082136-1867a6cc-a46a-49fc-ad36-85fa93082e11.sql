-- Create social_boosts table to track social boost interactions
CREATE TABLE public.social_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('challenge_suggestion', 'trending_challenge', 'momentum_boost', 'daily_motivation')),
  friend_id UUID NOT NULL,
  friend_name TEXT NOT NULL,
  challenge_id TEXT,
  challenge_name TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shown BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_boosts ENABLE ROW LEVEL SECURITY;

-- Create policies for social_boosts
CREATE POLICY "Users can view their own social boosts" 
ON public.social_boosts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social boosts" 
ON public.social_boosts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social boosts" 
ON public.social_boosts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social boosts" 
ON public.social_boosts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_social_boosts_updated_at
BEFORE UPDATE ON public.social_boosts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_social_boosts_user_id ON public.social_boosts(user_id);
CREATE INDEX idx_social_boosts_friend_id ON public.social_boosts(friend_id);
CREATE INDEX idx_social_boosts_type ON public.social_boosts(type);
CREATE INDEX idx_social_boosts_shown ON public.social_boosts(shown);
CREATE INDEX idx_social_boosts_triggered_at ON public.social_boosts(triggered_at);