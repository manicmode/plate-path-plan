-- Update SELECT policy on public.private_challenges to be null-safe for invited_user_ids
ALTER POLICY "Users can view accessible private challenges"
ON public.private_challenges
FOR SELECT
USING (
  (auth.uid() = creator_id)
  OR (auth.uid() = ANY (COALESCE(invited_user_ids, '{}'::uuid[])))
);
