// ⚠️ DEPRECATED IMPORT: Import ArenaPanel instead of ArenaV2Panel directly
import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArenaActive, useArenaMyMembership, useArenaEnroll, useArenaMembers, useArenaLeaderboardWithProfiles } from '@/hooks/arenaV2/useArena';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, TrendingUp, TrendingDown, Target, Flame, MessageSquare, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { ARENA_DEBUG_CONTROLS } from '@/lib/featureFlags';
import WinnersRibbon from '@/components/arena/WinnersRibbon';
import SectionDivider from '@/components/arena/SectionDivider';
import { BillboardSkeleton } from '@/components/arena/ArenaSkeletons';
import EmojiTray from '@/components/arena/EmojiTray';
import { useEmojiReactions } from '@/hooks/useEmojiReactions';
import MemberTabsStack, { type MemberTab } from '@/components/arena/MemberTabsStack';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { fetchUserStats } from '@/hooks/arena/useUserStats';
import { makeMembersForTabs } from '@/utils/arenaHelpers';

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
  const { data: members } = useArenaMembers(challengeId, 100, 0);
  const { data: leaderboard, isLoading: leaderboardLoading } = useArenaLeaderboardWithProfiles({ challengeId, section:'global', limit:50 });
  const isMobile = useIsMobile();
  
  // Feature flags
  const { enabled: winnersRibbonEnabled } = useFeatureFlag('arena_winners_ribbon');
  const { enabled: showWinnersRibbonBelowTabs } = useFeatureFlag('arena_show_winners_ribbon_below_tabs');
  const { enabled: emojiEnabled } = useFeatureFlag('arena_emoji_tray');
  const { enabled: profileModalEnabled } = useFeatureFlag('arena_profile_modal');
  const { enabled: debugControlsEnabled } = useFeatureFlag('arena_debug_controls');
  
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

  // Auto-enroll on mount (safe/idempotent)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await supabase.rpc('arena_enroll_me', { challenge_id_param: null });
      } catch (error) {
        // Silently ignore enrollment errors
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['arena'] });
      }
    })();
    return () => { cancelled = true; };
  }, [queryClient]);

  // Build members data for tabs stack using helper function
  const membersForTabs: MemberTab[] = React.useMemo(() => {
    if (!members?.length) return [];
    
    const mergedMembers = makeMembersForTabs(
      members.map(m => ({ user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url })),
      leaderboard?.map(l => ({ 
        user_id: l.user_id, 
        display_name: l.display_name, 
        avatar_url: l.avatar_url, 
        points: l.points, 
        streak: l.streak, 
        rank: l.rank 
      })) || []
    );
    
    return mergedMembers;
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
              {loadingActive ? 'Loading…' : active ? `Season ${active.season}.${String(active.month).padStart(2,'0')}` : 'No active arena'}
            </div>
            <div className="flex items-center gap-2">
              {me && (
                <div className="text-xs rounded-full px-2 py-1 bg-emerald-600/10 text-emerald-700">Enrolled</div>
              )}
              {/* DEV: quick award + recompute - only show if debug controls enabled */}
              {ARENA_DEBUG_CONTROLS && (
                <>
                  <Button size="sm" variant="secondary" onClick={async () => {
                    // TODO: Replace with actual arena_award_points RPC when available
                    console.log('Would award points here');
                  }}>
                    +1 point & Recompute
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    // TODO: Replace with actual arena_recompute_rollups_monthly RPC when available
                    console.log('Would recompute rollups here');
                  }}>
                    Recompute Rollups
                  </Button>
                </>
              )}
            </div>
          </div>

          <SectionDivider title="Live Leaderboard" />
          
          {leaderboardLoading ? (
            <BillboardSkeleton rows={10} />
          ) : (leaderboard?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {membersForTabs.length > 0 ? "Leaderboard will appear once members start earning points." : "No contenders yet. Invite friends or start logging to climb the board."}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard!.map((row, index) => {
                // Determine rank badge styling (gold/silver/bronze for top 3)
                const getRankBadgeStyle = (rank: number) => {
                  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-950";
                  if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900";
                  if (rank === 3) return "bg-gradient-to-r from-amber-600 to-orange-700 text-orange-100";
                  return "bg-gradient-to-r from-slate-400 to-slate-600 text-slate-100";
                };

                // Mock trend logic (you'll replace with actual trend data)
                const getTrendChip = () => {
                  // For demo: randomly show rising/falling/unchanged
                  const trendType = Math.random();
                  if (trendType < 0.4) {
                    return { type: 'rising', icon: TrendingUp, text: 'Rising', color: 'text-green-600' };
                  } else if (trendType < 0.7) {
                    return { type: 'falling', icon: TrendingDown, text: 'Falling', color: 'text-red-600' };
                  }
                  return null; // unchanged - hidden
                };

                const trend = getTrendChip();

                return (
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
                    className="relative rounded-xl dark:bg-slate-800/60 bg-slate-100/60 border dark:border-slate-700/70 border-slate-200/70 overflow-visible cursor-pointer hover:bg-accent hover:border-accent-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200"
                    style={{ animationDelay: `${index * 40}ms` }}
                    aria-label={`Open profile for ${row.display_name || 'user'}`}
                  >
                    {/* Rank badge (left side) */}
                    <span
                      aria-label={`Rank ${row.rank}`}
                      className={cn(
                        "pointer-events-none absolute -left-3 -top-3 z-20 select-none rounded-full px-2 py-0.5 text-xs font-bold shadow-md",
                        getRankBadgeStyle(row.rank)
                      )}
                    >
                      #{row.rank}
                    </span>

                    {/* Trend chip (right side) - only if there's a trend */}
                    {trend && (
                      <div className="absolute top-3 right-3 z-10">
                        <Badge variant="outline" className={cn("flex items-center gap-1", trend.color)}>
                          <trend.icon className="h-3 w-3" />
                          {trend.text}
                        </Badge>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Left side: Avatar + Name + Mini-stats */}
                        <div className="flex items-center gap-3 pl-2 flex-1 min-w-0">
                          <Avatar className={cn(isMobile ? "h-10 w-10" : "h-12 w-12", "flex-shrink-0")}>
                            <AvatarImage src={row.avatar_url ?? undefined} alt={row.display_name ?? "user"} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              <Initials name={row.display_name} />
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate">
                              {row.display_name ?? row.user_id}
                            </div>
                            {/* Mini-stats inline */}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-orange-500" />
                                <span>{row.streak ?? 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3 text-blue-500" />
                                <span className="font-medium">{row.points} pts</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <SectionDivider title="Arena Members" />
          
          {membersForTabs.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-muted rounded w-32 mx-auto mb-2"></div>
                <div className="h-3 bg-muted rounded w-24 mx-auto"></div>
              </div>
            </div>
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