-- Create billboard tables first
CREATE TABLE IF NOT EXISTS public.billboard_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  author_system text,
  author_user_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  meta jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pinned boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.billboard_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billboard_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.billboard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billboard_reactions ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints
ALTER TABLE public.billboard_events
  ADD CONSTRAINT IF NOT EXISTS billboard_events_challenge_fk
  FOREIGN KEY (challenge_id) REFERENCES public.private_challenges(id) ON DELETE CASCADE;

ALTER TABLE public.billboard_comments
  ADD CONSTRAINT IF NOT EXISTS billboard_comments_event_fk
  FOREIGN KEY (event_id) REFERENCES public.billboard_events(id) ON DELETE CASCADE;

ALTER TABLE public.billboard_reactions
  ADD CONSTRAINT IF NOT EXISTS billboard_reactions_event_fk
  FOREIGN KEY (event_id) REFERENCES public.billboard_events(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_be_challenge_created_desc ON public.billboard_events(challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_event_created ON public.billboard_comments(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_br_event_created ON public.billboard_reactions(event_id, created_at);

-- === RLS policies ===

-- billboard_events: members (creator or participant) can select/insert; creator can update (e.g., pin)
CREATE POLICY "be_select_members" ON public.billboard_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.private_challenges pc
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE pc.id = billboard_events.challenge_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "be_insert_members" ON public.billboard_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.private_challenges pc
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE pc.id = billboard_events.challenge_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "be_update_creator" ON public.billboard_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.private_challenges pc
      WHERE pc.id = billboard_events.challenge_id AND pc.creator_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.private_challenges pc
      WHERE pc.id = billboard_events.challenge_id AND pc.creator_id = auth.uid()
    )
  );

-- billboard_comments: members can read; members can insert as themselves; authors can delete own
CREATE POLICY "bc_select_members" ON public.billboard_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.billboard_events e
      JOIN public.private_challenges pc ON pc.id = e.challenge_id
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE e.id = billboard_comments.event_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "bc_insert_member_self" ON public.billboard_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM public.billboard_events e
      JOIN public.private_challenges pc ON pc.id = e.challenge_id
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE e.id = billboard_comments.event_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "bc_delete_own" ON public.billboard_comments
  FOR DELETE USING (user_id = auth.uid());

-- billboard_reactions: members can read; users can add/remove their own reactions
CREATE POLICY "br_select_members" ON public.billboard_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.billboard_events e
      JOIN public.private_challenges pc ON pc.id = e.challenge_id
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE e.id = billboard_reactions.event_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "br_insert_member_self" ON public.billboard_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1
      FROM public.billboard_events e
      JOIN public.private_challenges pc ON pc.id = e.challenge_id
      LEFT JOIN public.private_challenge_participations p
        ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
      WHERE e.id = billboard_reactions.event_id
        AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
    )
  );

CREATE POLICY "br_delete_own" ON public.billboard_reactions
  FOR DELETE USING (user_id = auth.uid());