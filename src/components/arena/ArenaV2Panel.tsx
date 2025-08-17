// Main Arena implementation - import via ArenaPanel for proper facade
import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArenaActive, useArenaMyMembership, useArenaEnroll, useArenaMembers, useArenaLeaderboardWithProfiles } from '@/hooks/useArena';
import { toast } from '@/hooks/use-toast';
import { useArenaChat } from '@/hooks/useArenaChat';
import { useRuntimeFlag } from '@/hooks/useRuntimeFlag';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, TrendingUp, TrendingDown, Target, Flame, MessageSquare, Sparkles, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { ARENA_DEBUG_CONTROLS } from '@/lib/featureFlags';
import WinnersRibbon from '@/components/arena/WinnersRibbon';
import SectionDivider from '@/components/ui/SectionDivider';
import { BillboardSkeleton } from '@/components/arena/ArenaSkeletons';
import EmojiTray from '@/components/arena/EmojiTray';
import { useEmojiReactions } from '@/hooks/useEmojiReactions';
import MemberTabsStack, { type MemberTab } from '@/components/arena/MemberTabsStack';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
// User stats functionality moved to V2 implementation
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
  // Arena V2 implementation - unified arena functionality
  
  const queryClient = useQueryClient();
  
  // Check hard disable flag
  const { value: hardDisabled, loading: flagLoading } = useRuntimeFlag('arena_v2_hard_disable', {
    defaultValue: false,
    subscribe: true,
    refreshOnFocus: true,
  });
  
  // V2 Arena hooks
  const { groupId, isLoading: loadingActive } = useArenaActive();
  const { data: me } = useArenaMyMembership(); // Legacy membership check
  const { members, isLoading: membersLoading } = useArenaMembers(groupId);
  const { leaderboard, isLoading: leaderboardLoading } = useArenaLeaderboardWithProfiles(groupId);
  const { messages } = useArenaChat(groupId);
  const { enroll, isEnrolling, error: enrollError } = useArenaEnroll();

  const handleJoinArena = async () => {
    const enrolledGroupId = await enroll();
    if (enrolledGroupId) {
      toast({
        title: "Joined Arena!",
        description: "Welcome to your Arena group. Start tracking to compete with others!",
      });
    } else if (enrollError) {
      toast({
        title: "Failed to join Arena",
        description: enrollError.message,
        variant: "destructive",
      });
    }
  };
  
  // Diagnostics state
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
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

  // Profile modal handlers - simplified for V2
  const prefetchUser = useCallback((userId: string) => {
    // Simple user prefetch - functionality moved to UserStatsModal
    console.log(`Prefetching stats for user: ${userId}`);
  }, []);

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
        await supabase.rpc('arena_enroll_me');
        console.debug('[ArenaV2Panel] Auto-enrolled in arena');
      } catch (error) {
        console.debug('[ArenaV2Panel] Auto-enroll failed (may already be enrolled):', error);
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['arena'] });
      }
    })();
    return () => { cancelled = true; };
  }, [queryClient]);

  // Diagnostics drawer keyboard shortcut (Ctrl/Cmd+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setDiagnosticsOpen(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build members data for tabs stack using helper function
  const membersForTabs: MemberTab[] = React.useMemo(() => {
    if (!members?.length) return [];
    
    const mergedMembers = makeMembersForTabs(
      members.map(m => ({ user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url })),
      leaderboard?.map(l => ({ 
        user_id: l.user_id, 
        display_name: l.display_name, 
        avatar_url: l.avatar_url, 
        points: l.score || 0, 
        streak: 0, // V2 leaderboard doesn't have streak yet
        rank: l.rank 
      })) || []
    );
    
    return mergedMembers;
  }, [leaderboard, members]);

  // Real-time updates for new members (V2)
  useEffect(() => {
    if (!groupId) return;

    console.debug('[ArenaV2Panel] Setting up realtime for group:', groupId);
    const channel = supabase
      .channel('arena-members-updates-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_memberships'
        },
        () => {
          console.debug('[ArenaV2Panel] Arena membership changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['arena', 'members-v2'] });
          queryClient.invalidateQueries({ queryKey: ['arena', 'leaderboard-v2'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  // Show maintenance message if hard disabled (only when flag is resolved to true, not during loading)
  if (!flagLoading && hardDisabled) {
    return (
      <div className="space-y-6" data-testid="arena-v2">
        <Card className="overflow-visible border-2 shadow-xl relative dark:border-orange-500/30 border-orange-400/40 dark:bg-slate-900/40 bg-slate-50/40">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-3 justify-center">
              <Wrench className="h-6 w-6 text-orange-500" />
              Arena is temporarily unavailable
              <Wrench className="h-6 w-6 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Under Maintenance</h3>
              <p className="text-muted-foreground">
                We're performing maintenance. Please check back soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Arena
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
          {/* No Group State - Join Arena */}
          {!loadingActive && !groupId && (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Join the Arena</h3>
              <p className="text-muted-foreground mb-6">
                Compete with others in fitness challenges!
              </p>
              <Button 
                onClick={handleJoinArena} 
                disabled={isEnrolling}
                size="lg"
                className="min-w-32"
              >
                {isEnrolling ? "Joining..." : "Join Arena"}
              </Button>
            </div>
          )}

          {/* Arena Content */}
          {!loadingActive && groupId && (
            <>
              {/* Debug controls only if enabled */}
              {ARENA_DEBUG_CONTROLS && (
                <div className="flex items-center justify-end gap-2 mb-6">
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
                </div>
              )}
          
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
                                    <Target className="h-3 w-3 text-blue-500" />
                                    <span className="font-medium">{row.score} pts</span>
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
            </>
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

      {/* Diagnostics Drawer */}
      {diagnosticsOpen && (
        <Card className="mt-4 border-dashed border-orange-400">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Arena V2 Diagnostics
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setDiagnosticsOpen(false)}
                className="ml-auto h-6 w-6 p-0"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div><strong>Group ID:</strong> {groupId || 'null'}</div>
            <div><strong>Members Count:</strong> {members?.length || 0}</div>
            <div><strong>Leaderboard Count:</strong> {leaderboard?.length || 0}</div>
            <div><strong>Chat Messages Count:</strong> {messages?.length || 0}</div>
            <div><strong>Last Message:</strong> {
              messages?.length > 0 
                ? new Date(messages[messages.length - 1].created_at).toLocaleTimeString()
                : 'No messages'
            }</div>
            <div className="text-muted-foreground pt-2">
              Press Ctrl/⌘+D to toggle this panel
            </div>
          </CardContent>
        </Card>
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
