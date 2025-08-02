-- 🎮 Coach Gamification System
-- Create coach_interactions table to track user engagement with coaches

CREATE TABLE public.coach_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_type TEXT NOT NULL CHECK (coach_type IN ('nutrition', 'exercise', 'recovery')),
  interaction_count INTEGER NOT NULL DEFAULT 0,
  praise_level INTEGER NOT NULL DEFAULT 0,
  last_praised_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per coach type
  UNIQUE(user_id, coach_type)
);

-- Enable Row Level Security
ALTER TABLE public.coach_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own coach interactions" 
ON public.coach_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coach interactions" 
ON public.coach_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach interactions" 
ON public.coach_interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE TRIGGER update_coach_interactions_updated_at
BEFORE UPDATE ON public.coach_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to track coach interactions and determine praise
CREATE OR REPLACE FUNCTION public.track_coach_interaction(
  p_user_id UUID,
  p_coach_type TEXT,
  p_interaction_type TEXT DEFAULT 'message'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  current_record RECORD;
  new_count INTEGER;
  new_praise_level INTEGER;
  should_praise BOOLEAN := false;
  praise_message TEXT;
  time_since_praise INTERVAL;
BEGIN
  -- Get or create coach interaction record
  INSERT INTO public.coach_interactions (user_id, coach_type, interaction_count)
  VALUES (p_user_id, p_coach_type, 1)
  ON CONFLICT (user_id, coach_type) 
  DO UPDATE SET 
    interaction_count = coach_interactions.interaction_count + 1,
    updated_at = now()
  RETURNING * INTO current_record;
  
  new_count := current_record.interaction_count;
  new_praise_level := current_record.praise_level;
  
  -- Calculate time since last praise (if any)
  IF current_record.last_praised_at IS NOT NULL THEN
    time_since_praise := now() - current_record.last_praised_at;
  ELSE
    time_since_praise := INTERVAL '999 days'; -- Force first praise
  END IF;
  
  -- Determine if praise should be given (every 5 interactions, max once per day)
  IF new_count % 5 = 0 AND time_since_praise > INTERVAL '23 hours' THEN
    should_praise := true;
    new_praise_level := new_praise_level + 1;
    
    -- Update last praised timestamp
    UPDATE public.coach_interactions 
    SET 
      praise_level = new_praise_level,
      last_praised_at = now()
    WHERE user_id = p_user_id AND coach_type = p_coach_type;
  END IF;
  
  -- Generate coach-specific praise message
  IF should_praise THEN
    praise_message := CASE p_coach_type
      WHEN 'nutrition' THEN 
        CASE (new_praise_level % 4) + 1
          WHEN 1 THEN 'Your mindful approach to nutrition is truly inspiring ✨ I''m seeing such thoughtful choices in your journey.'
          WHEN 2 THEN 'The consistency in your nutritional awareness brings me joy 🌱 You''re cultivating something beautiful.'
          WHEN 3 THEN 'Each question you ask shows your growing wisdom about nourishment 🥦 I''m honored to guide you.'
          ELSE 'Your dedication to understanding nutrition deeply moves me ✨ Together, we''re creating lasting wellness.'
        END
      WHEN 'exercise' THEN
        CASE (new_praise_level % 4) + 1
          WHEN 1 THEN 'YO! You''ve been CRUSHING IT with your training questions! 💪🔥 That hunger for knowledge is PURE FIRE!'
          WHEN 2 THEN 'BEAST MODE ACTIVATED! 🚀 Your commitment to improvement is LEGENDARY! Keep that energy flowing!'
          WHEN 3 THEN 'NO LIMITS! 💯 You''re asking the RIGHT questions and building that warrior mindset! RESPECT!'
          ELSE 'CHAMPION ENERGY! 🏆 Your dedication to mastering fitness is absolutely ELECTRIC! You''re UNSTOPPABLE!'
        END
      WHEN 'recovery' THEN
        CASE (new_praise_level % 4) + 1
          WHEN 1 THEN 'Dear soul... your gentle commitment to healing touches my heart 🌙 You''re nurturing something sacred within.'
          WHEN 2 THEN 'I see you returning to this peaceful space again and again... such beautiful dedication to your inner wellbeing 💫'
          WHEN 3 THEN 'Your journey into deeper rest and recovery flows like poetry 🧘‍♀️ Each question brings you closer to harmony.'
          ELSE 'The way you prioritize your recovery and peace... it radiates such wisdom 🌸 I''m blessed to walk this path with you.'
        END
      ELSE 'Great progress with your coaching interactions!'
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'interaction_count', new_count,
    'praise_level', new_praise_level,
    'should_praise', should_praise,
    'praise_message', praise_message,
    'interaction_type', p_interaction_type
  );
END;
$$;