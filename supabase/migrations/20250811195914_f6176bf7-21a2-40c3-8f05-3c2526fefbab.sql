-- Create a view for challenges with participant counts
CREATE OR REPLACE VIEW public.challenges_with_counts AS
SELECT 
  c.*,
  COALESCE(COUNT(cm.user_id) FILTER (WHERE cm.status = 'joined'), 0) as participants
FROM public.challenges c
LEFT JOIN public.challenge_members cm ON c.id = cm.challenge_id
GROUP BY c.id, c.title, c.description, c.category, c.visibility, c.duration_days, 
         c.cover_emoji, c.invite_code, c.owner_user_id, c.created_at;

-- Grant permissions to access the view
GRANT SELECT ON public.challenges_with_counts TO anon, authenticated;