-- === RLS policies ONLY (idempotent) ===

-- billboard_events: members (creator or participant) can select/insert; creator can update (e.g., pin)
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_events' and policyname='be_select_members') then
    create policy "be_select_members" on public.billboard_events
      for select using (
        exists (
          select 1
          from public.private_challenges pc
          left join public.private_challenge_participations p
            on p.private_challenge_id = pc.id and p.user_id = auth.uid()
          where pc.id = billboard_events.challenge_id
            and (pc.creator_id = auth.uid() or p.user_id is not null)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_events' and policyname='be_insert_members') then
    create policy "be_insert_members" on public.billboard_events
      for insert with check (
        exists (
          select 1
          from public.private_challenges pc
          left join public.private_challenge_participations p
            on p.private_challenge_id = pc.id and p.user_id = auth.uid()
          where pc.id = billboard_events.challenge_id
            and (pc.creator_id = auth.uid() or p.user_id is not null)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_events' and policyname='be_update_creator') then
    create policy "be_update_creator" on public.billboard_events
      for update using (
        exists (
          select 1 from public.private_challenges pc
          where pc.id = billboard_events.challenge_id and pc.creator_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.private_challenges pc
          where pc.id = billboard_events.challenge_id and pc.creator_id = auth.uid()
        )
      );
  end if;
end
$policies$;

-- billboard_comments: members can read; members can insert as themselves; authors can delete own
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_comments' and policyname='bc_select_members') then
    create policy "bc_select_members" on public.billboard_comments
      for select using (
        exists (
          select 1
          from public.billboard_events e
          join public.private_challenges pc on pc.id = e.challenge_id
          left join public.private_challenge_participations p
            on p.private_challenge_id = pc.id and p.user_id = auth.uid()
          where e.id = billboard_comments.event_id
            and (pc.creator_id = auth.uid() or p.user_id is not null)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_comments' and policyname='bc_insert_member_self') then
    create policy "bc_insert_member_self" on public.billboard_comments
      for insert with check (
        user_id = auth.uid() and exists (
          select 1
          from public.billboard_events e
          join public.private_challenges pc on pc.id = e.challenge_id
          left join public.private_challenge_participations p
            on p.private_challenge_id = pc.id and p.user_id = auth.uid()
          where e.id = billboard_comments.event_id
            and (pc.creator_id = auth.uid() or p.user_id is not null)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_comments' and policyname='bc_delete_own') then
    create policy "bc_delete_own" on public.billboard_comments
      for delete using (user_id = auth.uid());
  end if;
end
$policies$;

-- billboard_reactions: members can read; users can add/remove their own reactions
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_reactions' and policyname='br_select_members') then
    create policy "br_select_members" on public.billboard_reactions
      for select using (
        exists (
          select 1
          from public.billboard_events e
          join public.private_challenges pc on pc.id = e.challenge_id
          left join public.private_challenge_participations p
            on p.private_challenge_id = pc.id and p.user_id = auth.uid()
          where e.id = billboard_reactions.event_id
            and (pc.creator_id = auth.uid() or p.user_id is not null)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_reactions' and policyname='br_insert_member_self') then
    create policy "br_insert_member_self" on public.billboard_reactions
      for insert with check (
        user_id = auth.uid() and exists (
          select 1
          from public.billboard_events e
          join public.private_challenges pc on pc.id = e.challenge_id
          left join public.private_challenge_participations p
            on p.private_challenge_id = pc.id and p.user_id = auth.uid()
          where e.id = billboard_reactions.event_id
            and (pc.creator_id = auth.uid() or p.user_id is not null)
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='billboard_reactions' and policyname='br_delete_own') then
    create policy "br_delete_own" on public.billboard_reactions
      for delete using (user_id = auth.uid());
  end if;
end
$policies$;