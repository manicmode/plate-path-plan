-- Secure challenge-related tables with proper RLS policies (handling existing policies)

-- Fix challenge_messages table - restrict viewing to participants only
DROP POLICY IF EXISTS "Users can view challenge messages" ON public.challenge_messages;

-- Create a more secure policy for viewing challenge messages
CREATE POLICY "Users can view messages from challenges they participate in"
ON public.challenge_messages
FOR SELECT
USING (
  -- Allow viewing if user is a participant in private challenges
  EXISTS (
    SELECT 1 FROM public.private_challenge_participations pcp
    WHERE pcp.user_id = auth.uid() 
    AND pcp.private_challenge_id::text = challenge_messages.challenge_id
  )
  OR
  -- Allow viewing of public challenge messages
  EXISTS (
    SELECT 1 FROM public.public_challenges pc
    WHERE pc.id::text = challenge_messages.challenge_id
  )
  OR
  -- Allow viewing recovery challenge messages (these use different ID format)
  challenge_messages.challenge_id LIKE 'recovery_%'
);

-- Secure tables that don't already have RLS enabled
DO $$
BEGIN
  -- Enable RLS on tables that don't have it yet
  BEGIN
    ALTER TABLE public.user_challenge_participations ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN OTHERS THEN NULL; -- Table already has RLS or doesn't exist
  END;
  
  BEGIN
    ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.private_challenges ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.recovery_challenge_metrics ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
END$$;

-- Create policies for user_challenge_participations if they don't exist
DO $$
BEGIN
  -- Check if policies exist and create them if they don't
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_challenge_participations' 
    AND policyname = 'Users can view their own participations'
  ) THEN
    CREATE POLICY "Users can view their own participations"
    ON public.user_challenge_participations
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_challenge_participations' 
    AND policyname = 'Users can create their own participations'
  ) THEN
    CREATE POLICY "Users can create their own participations"
    ON public.user_challenge_participations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_challenge_participations' 
    AND policyname = 'Users can update their own participations'
  ) THEN
    CREATE POLICY "Users can update their own participations"
    ON public.user_challenge_participations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_challenge_participations' 
    AND policyname = 'Users can delete their own participations'
  ) THEN
    CREATE POLICY "Users can delete their own participations"
    ON public.user_challenge_participations
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END$$;