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
import ArenaBillboardChatPanel from '@/components/arena/ArenaBillboardChatPanel';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { nameCase } from '@/lib/nameCase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { ARENA_DEBUG_CONTROLS } from '@/lib/featureFlags';
import WinnersRibbon from '@/components/arena/WinnersRibbon';
import SectionDivider from '@/components/ui/SectionDivider';
import { BillboardSkeleton } from '@/components/arena/ArenaSkeletons';
import EmojiTray from '@/components/arena/EmojiTray';
import { useEmojiReactions } from '@/hooks/useEmojiReactions';

import { UserStatsModal } from '@/components/analytics/UserStatsModal';
// User stats functionality moved to V2 implementation


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

interface ArenaV2PanelProps {
  challengeMode?: string;
}

export default function ArenaV2Panel({ challengeMode = 'combined' }: ArenaV2PanelProps) {
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
  const { leaderboard, isLoading: leaderboardLoading } = useArenaLeaderboardWithProfiles(groupId, challengeMode);
  const { messages } = useArenaChat(groupId);
  const { enroll, isEnrolling, error: enrollError } = useArenaEnroll();

  // --- Forensics: snapshot of inputs ---
  console.log('[Arena] snapshot', {
    groupId,
    domain: challengeMode,
    leaderboardLen: leaderboard?.length ?? 0,
    membersLen: members?.length ?? 0,
  });

  // --- Forensics: data from hooks (what we actually got) ---
  console.log('[Arena] data.members', {
    groupId,
    domain: challengeMode,
    count: (members ?? []).length,
    ids: (members ?? []).map(m => m.user_id),
  });

  console.log('[Arena] data.leaderboard', {
    groupId,
    domain: challengeMode,
    count: (leaderboard ?? []).length,
    ids: (leaderboard ?? []).map(r => r.user_id),
  });

  // (Optional) first avatar url to verify bucket
  if (leaderboard?.[0]?.avatar_url) {
    console.log('[Arena] avatar.sample', leaderboard[0].avatar_url);
  }

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
  
  // Billboard & Chat modal state
  const [billboardChatOpen, setBillboardChatOpen] = useState(false);
  
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
      {/* Billboard & Chat Pill Button */}
      <Button
        onClick={() => setBillboardChatOpen(true)}
        className="w-full h-14 text-white font-medium text-lg bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 rounded-2xl shadow-lg"
      >
        <MessageSquare className="h-5 w-5 mr-2" />
        Billboard & Chat
      </Button>

      {/* Live Rankings Arena Card */}
      <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="text-center space-y-4 pb-4">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            🏆 Live Rankings Arena 🏆
          </CardTitle>
        </CardHeader>

        
        <CardContent className="p-6">
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
              {leaderboardLoading ? (
                <BillboardSkeleton rows={3} />
              ) : (leaderboard?.length ?? 0) === 0 && members?.length > 0 ? (
                // Show members with 0 scores when no leaderboard data exists
                <>
                  <div className="space-y-3">
                    {(() => {
                      const hasLeaderboard = (leaderboard?.length ?? 0) > 0;
                      const hasMembers = (members?.length ?? 0) > 0;
                      
                      // Guard: only render fallback when no leaderboard AND not loading
                      if (leaderboardLoading || hasLeaderboard || !hasMembers) {
                        return null;
                      }
                      
                      // BEFORE the members-fallback .map(...)
                      console.log('[Arena] RENDER_PATH', 'members-fallback-list', {
                        ids: (members ?? []).map(m => m.user_id),
                      });
                      
                      return members.map((member, index) => {
                    const rank = index + 1;
                    const getRankBadgeStyle = () => "bg-orange-500 text-black";
                    const formatPoints = (points: number) => points.toLocaleString();

                    return (
                      <div 
                        key={member.user_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openUserProfile({ user_id: member.user_id, display_name: member.display_name, avatar_url: member.avatar_url }, "leaderboard")}
                        className="relative rounded-xl bg-muted/50 border border-border p-4 cursor-pointer hover:bg-muted transition-all duration-200"
                      >
                        <span
                          className={cn(
                            "absolute -left-3 -top-3 z-20 rounded-full px-2.5 py-1 text-sm font-bold shadow-md",
                            getRankBadgeStyle()
                          )}
                        >
                          #{rank}
                        </span>

                        <div className="flex items-center justify-between pl-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage 
                                src={member.avatar_url || undefined} 
                                alt={member.display_name || "user"}
                                className="object-cover"
                              />
                               <AvatarFallback className="bg-teal-500 text-white font-semibold text-sm">
                                 <Initials name={nameCase(member.display_name)} />
                               </AvatarFallback>
                             </Avatar>
                             
                             <div className="min-w-0 flex-1">
                               <div className="font-semibold text-foreground text-base truncate normal-case">
                                 {nameCase(member.display_name) ?? member.user_id}
                               </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Flame className="h-3 w-3 text-orange-500" />
                                <span>0 streak</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <TrendingUp className="h-3 w-3" />
                              <span>↗︎ Rising</span>
                            </div>
                            <div className="flex items-center gap-1 text-foreground">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-lg font-bold">{formatPoints(0)}</span>
                              <span className="text-sm text-muted-foreground">pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                      });
                    })()}
                  </div>
                </>
              ) : (leaderboard?.length ?? 0) === 0 ? (
                <div className="py-8"></div>
              ) : (
                <>
                  <div className="space-y-3">
                    {(() => {
                      // BEFORE the leaderboard .map(...)
                      console.log('[Arena] RENDER_PATH', 'leaderboard-list', {
                        ids: (leaderboard ?? []).map(r => r.user_id),
                      });
                      return leaderboard!.map((row, index) => {
                        const rank = row.rank || (index + 1);
                    // Orange rank badge styling
                    const getRankBadgeStyle = () => {
                      return "bg-orange-500 text-black";
                    };

                    // Format points with comma separator
                    const formatPoints = (points: number) => {
                      return points.toLocaleString();
                    };

                    return (
                      <div 
                        key={row.user_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openUserProfile({ user_id: row.user_id, display_name: row.display_name, avatar_url: row.avatar_url }, "leaderboard")}
                        className="relative rounded-xl bg-muted/50 border border-border p-4 cursor-pointer hover:bg-muted transition-all duration-200"
                      >
                        {/* Orange rank badge (left side) */}
                        <span
                          className={cn(
                            "absolute -left-3 -top-3 z-20 rounded-full px-2.5 py-1 text-sm font-bold shadow-md",
                            getRankBadgeStyle()
                          )}
                        >
                          #{rank}
                        </span>

                        <div className="flex items-center justify-between pl-4">
                          {/* Left side: Avatar + Name + Streak */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage 
                                src={row.avatar_url || undefined} 
                                alt={row.display_name || "user"}
                                className="object-cover"
                              />
                               <AvatarFallback className="bg-teal-500 text-white font-semibold text-sm">
                                 <Initials name={nameCase(row.display_name)} />
                               </AvatarFallback>
                             </Avatar>
                             
                             <div className="min-w-0 flex-1">
                               <div className="font-semibold text-foreground text-base truncate normal-case">
                                 {nameCase(row.display_name) ?? row.user_id}
                               </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Flame className="h-3 w-3 text-orange-500" />
                                <span>0 streak</span>
                              </div>
                            </div>
                          </div>

                          {/* Right side: Rising indicator + Points */}
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <TrendingUp className="h-3 w-3" />
                              <span>↗︎ Rising</span>
                            </div>
                            <div className="flex items-center gap-1 text-foreground">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-lg font-bold">{formatPoints(row.score || 0)}</span>
                              <span className="text-sm text-muted-foreground">pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                      });
                    })()}
                  </div>
                </>
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

      {/* Billboard & Chat Modal */}
      <ArenaBillboardChatPanel
        isOpen={billboardChatOpen}
        onClose={() => setBillboardChatOpen(false)}
      />

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
