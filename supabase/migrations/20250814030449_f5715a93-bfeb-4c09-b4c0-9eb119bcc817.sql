-- Polish and cleanup Arena Billboard & Chat feature

-- 1. Data Cleanup Before Adding Foreign Keys
-- Delete orphaned billboard messages
DELETE FROM public.rank20_billboard_messages 
WHERE challenge_id NOT IN (SELECT id FROM private_challenges);

-- Delete orphaned chat messages (invalid challenge_id)
DELETE FROM public.rank20_chat_messages 
WHERE challenge_id NOT IN (SELECT id FROM private_challenges);

-- Delete chat messages with invalid user_id 
DELETE FROM public.rank20_chat_messages 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. Composite Unique Index for Chat Deduplication
CREATE UNIQUE INDEX IF NOT EXISTS uq_rank20_chat_dedupe 
ON public.rank20_chat_messages (challenge_id, user_id, created_at, id);

-- 3. Admin-Only Announcements RLS Policy
-- Drop existing billboard message policies
DROP POLICY IF EXISTS "Users can view billboard messages for their rank20 groups" ON public.rank20_billboard_messages;

-- Create new restrictive policies for billboard messages
CREATE POLICY "Members can view billboard messages for their rank20 groups" 
ON public.rank20_billboard_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM private_challenges pc
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.id = rank20_billboard_messages.challenge_id 
    AND pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
));

-- Only service role can insert/update/delete announcements
CREATE POLICY "Only service role can manage billboard messages" 
ON public.rank20_billboard_messages 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');