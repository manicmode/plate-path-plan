-- Fix RLS policies for rank20_chat_messages so all group members can read/write each other's messages
DROP POLICY IF EXISTS "Users can view chat messages for their rank20 groups" ON public.rank20_chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages for their rank20 groups" ON public.rank20_chat_messages;

CREATE POLICY "Users can view chat messages for their rank20 groups"
ON public.rank20_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_groups rg
    JOIN public.rank20_members rm
      ON rm.group_id = rg.id
    WHERE rg.challenge_id = rank20_chat_messages.challenge_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert chat messages for their rank20 groups"
ON public.rank20_chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_groups rg
    JOIN public.rank20_members rm
      ON rm.group_id = rg.id
    WHERE rg.challenge_id = rank20_chat_messages.challenge_id
      AND rm.user_id = auth.uid()
  )
);

-- Fix RLS policies for rank20_chat_reactions so reactions show across accounts
DROP POLICY IF EXISTS "Users can view reactions for their rank20 groups" ON public.rank20_chat_reactions;
DROP POLICY IF EXISTS "Users can insert reactions for their rank20 groups" ON public.rank20_chat_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.rank20_chat_reactions;

CREATE POLICY "Users can view reactions for their rank20 groups"
ON public.rank20_chat_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_chat_messages cm
    JOIN public.rank20_groups rg ON rg.challenge_id = cm.challenge_id
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert reactions for their rank20 groups"
ON public.rank20_chat_reactions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_chat_messages cm
    JOIN public.rank20_groups rg ON rg.challenge_id = cm.challenge_id
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reactions"
ON public.rank20_chat_reactions
FOR DELETE
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_chat_messages cm
    JOIN public.rank20_groups rg ON rg.challenge_id = cm.challenge_id
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND rm.user_id = auth.uid()
  )
);