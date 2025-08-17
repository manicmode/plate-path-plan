// ⚠️ DEPRECATED IMPORT: Import ArenaPanel instead of ArenaV2Panel directly
import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArenaActive, useArenaMyMembership, useArenaEnroll, useArenaMembers, useArenaLeaderboardWithProfiles } from '@/hooks/arenaV2/useArena';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, TrendingUp, Target, Plus, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import WinnersRibbon from '@/components/arena/WinnersRibbon';
import SectionDivider from '@/components/arena/SectionDivider';
import { BillboardSkeleton } from '@/components/arena/ArenaSkeletons';
import EmojiTray from '@/components/arena/EmojiTray';
import { useEmojiReactions } from '@/hooks/useEmojiReactions';
import MemberTabsStack, { type MemberTab } from '@/components/arena/MemberTabsStack';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { fetchUserStats } from '@/hooks/arena/useUserStats';

function Initials({ name }: { name?: string|null }) {
  const t = (name ?? '').trim();
  if (!t) return <>{'?'}</>;
  const parts = t.split(/\s+/);
  const a = (parts[0]?.[0] ?? '').toUpperCase();
  const b = (parts[1]?.[0] ?? '').toUpperCase();
  return <>{(a+b||a||'?').slice(0,2)}</>;
}

type SelectedUser = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
} | null;

export default function ArenaV2Panel() {
  // Add deprecation warning for direct imports in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ DEPRECATED: Direct ArenaV2Panel import detected. Use ArenaPanel instead.');
    }
  }, []);
  
  const queryClient = useQueryClient();
  const { data: active, isLoading: loadingActive } = useArenaActive();
  const challengeId = active?.id;
  const { data: me } = useArenaMyMembership(challengeId);
  const enroll = useArenaEnroll();
  const { data: members } = useArenaMembers(challengeId, 100, 0);
  const { data: leaderboard, isLoading: leaderboardLoading } = useArenaLeaderboardWithProfiles({ challengeId, section:'global', limit:50 });
  const isMobile = useIsMobile();
  
  // Feature flags
  const { enabled: winnersRibbonEnabled } = useFeatureFlag('arena_winners_ribbon');
  const { enabled: showWinnersRibbonBelowTabs } = useFeatureFlag('arena_show_winners_ribbon_below_tabs');
  const { enabled: emojiEnabled } = useFeatureFlag('arena_emoji_tray');
  const { enabled: profileModalEnabled } = useFeatureFlag('arena_profile_modal');
  
  // Profile modal state
  const [selectedUser, setSelectedUser] = useState<SelectedUser>(null);
  
  // Emoji reactions state
  const { addReaction, getReactions } = useEmojiReactions();
  const [trayOpen, setTrayOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);

  const handleReactUser = useCallback((emoji: string) => {
    if (!activeTarget) return;
    addReaction(activeTarget, emoji);
    setTrayOpen(false);
    setActiveTarget(null);
  }, [activeTarget, addReaction]);

  // Profile modal handlers
  const prefetchUser = useCallback((userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["userStats", userId],
      queryFn: () => fetchUserStats(userId),
      staleTime: 5 * 60 * 1000, // 5 min
    }).catch(() => {});
  }, [queryClient]);

  const openUserProfile = useCallback((u: { user_id: string; display_name: string; avatar_url?: string | null }, source: "winners" | "leaderboard" | "members") => {
    if (!profileModalEnabled) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("arena_profile_modal is disabled; ignoring openUserProfile", { source, u });
      }
      return;
    }
    setSelectedUser({ user_id: u.user_id, display_name: u.display_name, avatar_url: u.avatar_url ?? undefined });
  }, [profileModalEnabled]);

  const closeUserProfile = useCallback(() => setSelectedUser(null), []);

  // Build members data for tabs stack
  const membersForTabs: MemberTab[] = React.useMemo(() => {
    if (!leaderboard?.length && !members?.length) return [];
    
    // Prefer leaderboard data (has points and rank)
    const leaderboardMap = new Map(leaderboard?.map(l => [l.user_id, l]) || []);
    
    // Combine data, preferring leaderboard info when available
    const allMembers = members?.map(member => {
      const leaderboardEntry = leaderboardMap.get(member.user_id);
      return {
        user_id: member.user_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        points: leaderboardEntry?.score || 0,
        rank: leaderboardEntry?.rank || null,
      };
    }) || [];
    
    // Sort by rank (nulls last), then by points descending, then by name
    return allMembers.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank && !b.rank) return -1;
      if (!a.rank && b.rank) return 1;
      if (a.points !== b.points) return (b.points || 0) - (a.points || 0);
      return (a.display_name || '').localeCompare(b.display_name || '');
    });
  }, [leaderboard, members]);

  // Real-time updates for new members
  useEffect(() => {
    if (!challengeId) return;

    const channel = supabase
      .channel('arena-members-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_memberships'
        },
        () => {
          // Invalidate both queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['arena', 'members'] });
          queryClient.invalidateQueries({ queryKey: ['arena', 'leaderboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, queryClient]);

  return (
    <div className="space-y-6" data-testid="arena-v2">
      <Card className="overflow-visible border-2 shadow-xl relative dark:border-emerald-500/30 border-emerald-400/40 dark:bg-slate-900/40 bg-slate-50/40 hover:border-emerald-500/60 transition-all duration-300">
        <CardHeader className={cn(
          "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
          isMobile ? "p-4" : "p-6"
        )}>
          <div className={cn(
            "flex items-center",
            isMobile ? "flex-col space-y-2" : "justify-between"
          )}>
            <CardTitle className={cn(
              "font-bold flex items-center gap-2",
              isMobile ? "text-xl text-center" : "text-3xl gap-3"
            )}>
              <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
              {active?.title ?? 'Live Rankings Arena'}
              <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {members?.length ?? 0} members
              </Badge>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                title="Refresh leaderboard"
              >
                <TrendingUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Member Tabs Stack (replaces winners ribbon at top) */}
          <MemberTabsStack
            members={membersForTabs}
            onOpenProfile={(member) => openUserProfile({ user_id: member.user_id, display_name: member.display_name, avatar_url: member.avatar_url }, "members")}
            onOpenEmojiTray={(userId) => { setActiveTarget(`user:${userId}`); setTrayOpen(true); }}
            onPrefetchStats={prefetchUser}
          />

          {/* Optional Winners Ribbon below tabs */}
          {winnersRibbonEnabled && showWinnersRibbonBelowTabs && (
            <div className="mt-4">
              <WinnersRibbon />
            </div>
          )}
        </CardHeader>
        
        <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="text-sm opacity-80">
              {loadingActive ? 'Loading…' : active ? `Season ${active.season_year}.${String(active.season_month).padStart(2,'0')}` : 'No active arena'}
            </div>
            {!me ? (
              <Button size="sm" onClick={() => enroll.mutate(challengeId)} disabled={enroll.isPending}>
                {enroll.isPending ? 'Joining…' : 'Join Arena'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-xs rounded-full px-2 py-1 bg-emerald-600/10 text-emerald-700">Enrolled</div>
                {/* DEV: quick award + recompute */}
                <Button size="sm" variant="secondary" onClick={async () => {
                  // use the 3-arg shim (server resolves active challenge)
                  await supabase.rpc("arena_award_points", { p_points: 1, p_kind: "tap", p_challenge_id: null });
                  await supabase.rpc("arena_recompute_rollups_monthly", {}); // uses current month + 'global'
                }}>
                  +1 point & Recompute
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.rpc("arena_recompute_rollups_monthly", {}); // current month/global
                }}>
                  Recompute Rollups
                </Button>
              </div>
            )}
          </div>

          <SectionDivider title="Live Leaderboard" />
          
          {leaderboardLoading ? (
            <BillboardSkeleton rows={10} />
          ) : (leaderboard?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                No contenders yet. Invite friends or start logging to climb the board.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard!.map((row, index) => (
                <div 
                  key={row.user_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openUserProfile({ user_id: row.user_id, display_name: row.display_name, avatar_url: row.avatar_url }, "leaderboard")}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openUserProfile({ user_id: row.user_id, display_name: row.display_name, avatar_url: row.avatar_url }, "leaderboard");
                    }
                  }}
                  onMouseEnter={() => prefetchUser(row.user_id)}
                  onFocus={() => prefetchUser(row.user_id)}
                  className="relative rounded-2xl dark:bg-slate-800/60 bg-slate-100/60 border dark:border-slate-700/70 border-slate-200/70 overflow-visible cursor-pointer hover:bg-accent hover:border-accent-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200"
                  style={{ animationDelay: `${index * 40}ms` }}
                  aria-label={`Open profile for ${row.display_name || 'user'}`}
                >
                  {/* Off-card rank badge */}
                  <span
                    aria-label={`Rank ${row.rank}`}
                    className="pointer-events-none absolute -left-3 -top-3 z-20 select-none rounded-full px-2 py-0.5 text-xs font-bold text-black shadow-md bg-gradient-to-r from-amber-400 to-orange-500"
                  >
                    #{row.rank}
                  </span>

                  {/* Rising chip */}
                  <div className="absolute top-3 right-3 z-10">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      Rising
                    </Badge>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 pl-2">
                        <Avatar className={cn(isMobile ? "h-10 w-10" : "h-12 w-12", "z-10")}>
                          <AvatarImage src={row.avatar_url ?? undefined} alt={row.display_name ?? "user"} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            <Initials name={row.display_name} />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="font-semibold text-foreground">
                            {row.display_name ?? row.user_id}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Member
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions and Points */}
                      <div className="ml-auto flex items-center gap-3">
                        {/* Reactions */}
                        {Object.entries(getReactions(`user:${row.user_id}`)).map(([emoji, count]) => (
                          <div key={emoji} className="rounded-full bg-white/10 px-2 py-0.5 text-sm ring-1 ring-white/10">
                            {emoji} <span className="text-white/70">{count}</span>
                          </div>
                        ))}
                        
                        {/* Add reaction button */}
                        {emojiEnabled && (
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setActiveTarget(`user:${row.user_id}`); 
                              setTrayOpen(true); 
                            }}
                            className="rounded-full p-1 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                            aria-label="Add reaction"
                          >
                            <Plus className="h-4 w-4 text-white/80" />
                          </button>
                        )}
                        
                        {/* Points */}
                        <div className="min-w-[84px] text-right tabular-nums">
                          <div className="inline-flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            <span className="font-semibold">{row.score}</span>
                            <span className="text-xs text-muted-foreground ml-1">pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <SectionDivider title="Arena Members" />
          
          {(members?.length ?? 0) === 0 ? (
            <div className="text-sm opacity-70 text-center py-4">No members yet.</div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {members!.map(m => (
                <div 
                  key={m.user_id} 
                  role="button"
                  tabIndex={0}
                  onClick={() => openUserProfile({ user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url }, "members")}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openUserProfile({ user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url }, "members");
                    }
                  }}
                  onMouseEnter={() => prefetchUser(m.user_id)}
                  onFocus={() => prefetchUser(m.user_id)}
                  className="flex flex-col items-center text-center cursor-pointer hover:bg-accent rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200"
                  aria-label={`Open profile for ${m.display_name || 'member'}`}
                >
                  <Avatar className="h-10 w-10">
                    {m.avatar_url ? <AvatarImage src={m.avatar_url} alt={m.display_name ?? ''}/> : null}
                    <AvatarFallback><Initials name={m.display_name}/></AvatarFallback>
                  </Avatar>
                  <div className="mt-1 text-xs truncate w-full">{m.display_name ?? 'Player'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Emoji Tray */}
      {emojiEnabled && (
        <EmojiTray
          open={trayOpen}
          onToggle={() => setTrayOpen(v => !v)}
          onReact={handleReactUser}
        />
      )}

      {/* Profile Modal */}
      <UserStatsModal
        open={!!selectedUser}
        onClose={closeUserProfile}
        userId={selectedUser?.user_id ?? ""}
        displayName={selectedUser?.display_name ?? ""}
        avatarUrl={selectedUser?.avatar_url ?? undefined}
      />
    </div>
  );
}