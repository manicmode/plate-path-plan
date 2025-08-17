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
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'Billboard' | 'Chat' | 'Rankings'>('Rankings');
  const [rankingSection, setRankingSection] = useState<'combined' | 'nutrition' | 'exercise' | 'recovery'>('combined');
  
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
      {/* Arena Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
          {(['Billboard', 'Chat', 'Rankings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-muted-foreground/10"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Slim Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

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
            </div>
          </div>
          
          <div className="text-sm opacity-80 text-center">
            {loadingActive ? 'Loading…' : active ? `Season ${active.season}.${String(active.month).padStart(2,'0')}` : 'No active arena'}
          </div>
        </CardHeader>
        
        <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
          {activeTab === 'Billboard' && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Billboard content coming soon</div>
            </div>
          )}

          {activeTab === 'Chat' && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Chat content coming soon</div>
            </div>
          )}

          {activeTab === 'Rankings' && (
            <>
              {/* Ranking Section Tabs */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                  {(['combined', 'nutrition', 'exercise', 'recovery'] as const).map((section) => (
                    <button
                      key={section}
                      onClick={() => setRankingSection(section)}
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                        rankingSection === section
                          ? "bg-background text-foreground shadow-sm"
                          : "hover:bg-muted-foreground/10"
                      )}
                    >
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </button>
                  ))}
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
                                {rankingSection === 'combined' ? 'Total Score' : `${rankingSection.charAt(0).toUpperCase() + rankingSection.slice(1)} Score`}
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
                                <span className="font-semibold">{row.points}</span>
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
            </>
          )}

          {me && (
            <div className="mt-6 text-center">
              <div className="text-xs rounded-full px-2 py-1 bg-emerald-600/10 text-emerald-700 inline-block">Enrolled</div>
            </div>
          )}

          {/* DEV: quick award + recompute - only show if debug controls enabled */}
          {ARENA_DEBUG_CONTROLS && (
            <div className="mt-6 flex justify-center gap-2">
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