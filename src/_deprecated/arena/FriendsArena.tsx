// ⚠️ DEPRECATED: This component is deprecated. Use ArenaPanel instead.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Trophy,
  Target,
  Flame,
  Crown,
  Medal,
  MessageSquare,
  Apple,
  Dumbbell,
  Heart,
  Plus
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/haptics';
import { useIsMobile } from '@/hooks/use-mobile';

import { useRank20Members, useArenaMembership } from '@/_deprecated/arena/useRank20Members';
import { useRank20ChallengeId } from '@/_deprecated/arena/useRank20ChallengeId';
import { useRank20Leaderboard } from '@/_deprecated/arena/useRank20Leaderboard';
import { useRank20LeaderboardSections, type ArenaRow } from '@/_deprecated/arena/useRank20LeaderboardSections';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { fetchUserStats, type UserStats } from '@/hooks/arena/useUserStats';
import { supabase } from '@/integrations/supabase/client';
import ArenaBillboardChatPanel from '@/components/arena/ArenaBillboardChatPanel';
import { useAuth } from '@/contexts/auth';
import ArenaSkeleton from '@/components/arena/ArenaSkeleton';
import { ArenaErrorBanner } from '@/components/arena/ArenaErrorBanner';
import { ArenaSmokeTester } from '@/components/arena/ArenaSmokeTester';
import { arenaUiHeartbeat } from '@/lib/arenaDiag';
import { useFriendStatuses } from '@/hooks/useFriendStatuses';
import { useFriendActions } from '@/hooks/useFriendActions';
import { FriendCTA } from '@/components/social/FriendCTA';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useFriendRealtime } from '@/hooks/useFriendRealtime';
import WinnersRibbon from '@/components/arena/WinnersRibbon';
import SectionDivider from '@/components/arena/SectionDivider';
import { BillboardSkeleton } from '@/components/arena/ArenaSkeletons';
import EmojiTray from '@/components/arena/EmojiTray';
import { useEmojiReactions } from '@/hooks/useEmojiReactions';

// Pretty numbers (e.g., 2,432)
const nf = new Intl.NumberFormat();
const formatNumber = (n?: number | null) => nf.format(Math.max(0, Number(n ?? 0)));

// Format points with 2 decimal places (e.g., 12.34)
const formatPoints = (n?: number | null) => Number(n ?? 0).toFixed(2);

interface FriendsArenaProps {
  friends?: any[]; // Keep for compatibility but unused
}

// Helper: two-letter initials from display name
function initials(name?: string) {
  const n = (name ?? "").trim();
  if (!n) return "US";
  const parts = n.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase();
}

const DevBadge = () => {
  if (typeof window === 'undefined') return null;
  const dbg = (window as any).__arenaDbg || {};
  if (!dbg?.cidSource || dbg.cidSource === 'rpc') return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        fontSize: 10,
        opacity: 0.7,
        padding: '2px 6px',
        borderRadius: 6,
        background: dbg.cidSource === 'fallback' ? '#1e293b' : '#7f1d1d',
        color: '#fff',
        zIndex: 1,
      }}
      data-testid="arena-cid-badge"
      title={dbg.cidError || ''}
    >
      {dbg.cidSource === 'fallback' ? 'fallback' : 
       dbg.cidSource === 'rpc-safe' ? 'safe' : 
       dbg.cidSource === 'rpc-fallback' ? 'rpc-fb' : 'no-cid'}
    </div>
  );
};

export const FriendsArena: React.FC<FriendsArenaProps> = ({ friends = [] }) => {
  // Add deprecation warning in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('⚠️ DEPRECATED: FriendsArena is deprecated and moved to _deprecated/arena/. Use ArenaPanel instead.');
    }
  }, []);
  
  const { user } = useAuth();
  const membership = useRank20Members(user?.id);
  const { data: members = [], isLoading: membersLoading, error: membersError } = membership;
  const membershipData = useArenaMembership();
  const { challengeId } = useRank20ChallengeId();
  const { data: rows, loading, error, refresh } = useRank20Leaderboard(20, 0);
  const { combined, nutrition, exercise, recovery, loading: sectionsLoading, error: sectionsError, refresh: refreshSections } = useRank20LeaderboardSections(20, 0);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<null | {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>(null);

  // Billboard modal state
  const [isBillboardOpen, setBillboardOpen] = useState(false);
  // Tab state
  const [activeTab, setActiveTab] = useState('combined');

  const getCurrentData = (): ArenaRow[] => {
    switch (activeTab) {
      case 'nutrition':
        return nutrition;
      case 'exercise':
        return exercise;
      case 'recovery':
        return recovery;
      default:
        return combined;
    }
  };

  // Friend management
  const userIds = useMemo(() => getCurrentData().map(row => row.user_id), [activeTab, combined, nutrition, exercise, recovery]);
  const { statusMap, loading: statusLoading, updateStatus } = useFriendStatuses(userIds);
  const friendActions = useFriendActions({ onStatusUpdate: updateStatus });
  
  // Feature flag for friend CTAs
  const { enabled: friendCtasEnabled } = useFeatureFlag('friend_ctas');
  
  // Feature flag for winners ribbon
  const { enabled: winnersRibbonEnabled } = useFeatureFlag('arena_winners_ribbon');
  
  // Feature flag for emoji tray
  const { enabled: emojiEnabled } = useFeatureFlag('arena_emoji_tray');
  
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

  // Friend status management with realtime updates
  useFriendRealtime({
    onUserIdsChanged: (userIds) => {
      // Refresh statuses for affected users if they're in our current data
      const currentData = getCurrentData();
      const affectedIds = userIds.filter(id => currentData.some(row => row.user_id === id));
      if (affectedIds.length > 0) {
        // The useFriendStatuses hook will automatically refresh when targetIds change
        // Since we're using the same targetIds array, we trigger a manual refresh
        refresh();
      }
    },
    enabled: friendCtasEnabled
  });

  // Add logging for inner tabs
  const handleTabChange = (value: string) => {
    console.log('[Inner Tabs] changed to', value);
    lightTap(); // Add haptic feedback
    setActiveTab(value);
  };

  // Anti-flicker loading state with grace period
  const ready = !loading && !sectionsLoading && !membersLoading && !!challengeId && rows.length > 0;
  const [showContent, setShowContent] = React.useState(false);

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'nutrition':
        return <Apple className="h-4 w-4" />;
      case 'exercise':
        return <Dumbbell className="h-4 w-4" />;
      case 'recovery':
        return <Heart className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  const handleRefresh = () => {
    refresh();
    refreshSections();
  };
  
  // Mark UI as ready when challengeId is resolved
  useEffect(() => {
    if (!challengeId) return;
    arenaUiHeartbeat?.(supabase, 'r20:ui:ready');
  }, [challengeId]);
  
  React.useEffect(() => {
    let t: any;
    if (ready) {
      // Small delay avoids a 1-frame swap that looks like a flash
      t = setTimeout(() => setShowContent(true), 150);
    } else {
      setShowContent(false);
    }
    return () => clearTimeout(t);
  }, [ready]);


  if (process.env.NODE_ENV !== 'production') {
    console.info('[Arena rows]', rows.length, rows.slice(0,3));
  }


  return (
    <section
      aria-busy={!showContent}
      aria-live="polite"
      className="min-h-[420px]"
    >
      {showContent ? (
        <>
          {(error || sectionsError) ? (
            <ArenaErrorBanner message={error?.message || sectionsError || 'Unknown error'} />
          ) : !rows.length ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                No contenders yet. Invite friends or start logging to climb the board.
              </div>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              <div className="my-6">
                <button
                  type="button"
                  onClick={async () => {
                    // Ensure membership before opening chat
                    await supabase.rpc('ensure_rank20_membership');
                    setBillboardOpen(true);
                  }}
                  className="w-80 mx-auto rounded-full px-4 py-3 text-sm md:text-base font-medium
                             bg-gradient-to-r from-fuchsia-500/80 via-purple-500/80 to-cyan-500/80
                             hover:from-fuchsia-500 hover:via-purple-500 hover:to-cyan-500
                             text-white shadow-md transition-colors flex items-center justify-center gap-2"
                  aria-label="Open Billboard & Chat"
                  data-testid="arena-billboard-pill"
                >
                  <MessageSquare className="h-4 w-4" />
                  Billboard &amp; Chat
                </button>
              </div>

              {/* Show Arena error banner only for real RPC errors */}
              {membershipData.data?.error && (
                <ArenaErrorBanner message={membershipData.data.error} />
              )}
      
      <Card className="overflow-visible border-2 shadow-xl relative dark:border-emerald-500/30 border-emerald-400/40 dark:bg-slate-900/40 bg-slate-50/40 hover:border-emerald-500/60 transition-all duration-300">
        <DevBadge />
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
              Live Rankings Arena
              <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {rows.length} members
              </Badge>
              <button
                onClick={handleRefresh}
                className="p-1 text-muted-foreground hover:text-foreground"
                title="Refresh leaderboard"
              >
                <TrendingUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Winners Ribbon */}
          {winnersRibbonEnabled && <WinnersRibbon />}
        </CardHeader>
        
        <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
          <SectionDivider title="Live Leaderboard" />
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6" data-testid="arena-section-switcher">
              <TabsTrigger value="combined" className="flex items-center gap-2 text-xs">
                {getTabIcon('combined')}
                <span className="hidden sm:inline">Combined</span>
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="flex items-center gap-2 text-xs">
                {getTabIcon('nutrition')}
                <span className="hidden sm:inline">Nutrition</span>
              </TabsTrigger>
              <TabsTrigger value="exercise" className="flex items-center gap-2 text-xs">
                {getTabIcon('exercise')}
                <span className="hidden sm:inline">Exercise</span>
              </TabsTrigger>
              <TabsTrigger value="recovery" className="flex items-center gap-2 text-xs">
                {getTabIcon('recovery')}
                <span className="hidden sm:inline">Recovery</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              {sectionsLoading ? (
                <BillboardSkeleton rows={10} />
              ) : (
                <div className="flex flex-col gap-5">
                  {getCurrentData().map((row, index) => (
            <div key={row.user_id} className="relative rounded-2xl dark:bg-slate-800/60 bg-slate-100/60 border dark:border-slate-700/70 border-slate-200/70 overflow-visible">
              {/* Off-card rank badge */}
              <span
                aria-label={`Rank ${row.rank}`}
                className="pointer-events-none absolute -left-3 -top-3 z-20 select-none rounded-full px-2 py-0.5 text-xs font-bold text-black shadow-md bg-gradient-to-r from-amber-400 to-orange-500"
              >
                #{row.rank}
              </span>

              {/* Pinned Rising chip */}
              <div className="absolute top-3 right-3 z-10">
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  Rising
                </Badge>
              </div>

              <div 
                className="p-4 cursor-pointer"
                onClick={() => setSelected({ 
                  user_id: row.user_id, 
                  display_name: row.display_name, 
                  avatar_url: row.avatar_url 
                })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected({ 
                      user_id: row.user_id, 
                      display_name: row.display_name, 
                      avatar_url: row.avatar_url 
                    });
                  }
                }}
                aria-label={`Open profile for ${row.display_name || 'this user'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 pl-2">
                    {/* Avatar with z-index */}
                    <Avatar className={cn(isMobile ? "h-10 w-10" : "h-12 w-12", "z-10")}>
                      <AvatarImage src={row.avatar_url ?? undefined} alt={row.display_name ?? "user"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {initials(row.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-semibold text-foreground">
                        {row.display_name}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {row.streak > 0 ? (
                          <>
                            <Flame className="h-3 w-3 text-orange-500" />
                            <span className="font-semibold">🔥 {row.streak}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                   {/* Points and Actions */}
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
                         onClick={() => { setActiveTarget(`user:${row.user_id}`); setTrayOpen(true); }}
                         className="rounded-full p-1 hover:bg-white/10 transition"
                         aria-label="Add reaction"
                       >
                         <Plus className="h-4 w-4 text-white/80" />
                       </button>
                     )}
                     
                     {/* Friend CTA */}
                      {friendCtasEnabled && (
                        <FriendCTA
                          userId={row.user_id}
                          relation={statusMap.get(row.user_id)?.relation || 'none'}
                          requestId={statusMap.get(row.user_id)?.requestId}
                          variant="compact"
                          onSendRequest={friendActions.sendFriendRequest}
                          onAcceptRequest={friendActions.acceptFriendRequest}
                          onRejectRequest={friendActions.rejectFriendRequest}
                          onCancelRequest={friendActions.cancelFriendRequest}
                          isPending={friendActions.isPending(row.user_id)}
                          isOnCooldown={friendActions.isOnCooldown(row.user_id)}
                          isLoading={statusLoading}
                        />
                      )}
                     
                     {/* Points */}
                     <div className="min-w-[84px] text-right tabular-nums">
                       <div className="inline-flex items-center gap-1">
                         <Target className="w-4 h-4" />
                         <span className="font-semibold">{formatPoints(row.points)}</span>
                         <span className="text-xs text-muted-foreground ml-1">pts</span>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
                   ))}
                   
                   {getCurrentData().length === 0 && (
                     <div className="text-center py-8 text-muted-foreground">
                       <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                       <p className="text-sm">No {activeTab} leaderboard data available</p>
                       <p className="text-xs mt-1">Check back later or invite friends to join!</p>
                     </div>
                   )}
                 </div>
               )}
             </TabsContent>
           </Tabs>
         </CardContent>
        
        {selected && (
          <UserStatsModal
            open={!!selected}
            onClose={() => setSelected(null)}
            userId={selected?.user_id ?? ""}
            displayName={selected?.display_name ?? ""}
            avatarUrl={selected?.avatar_url ?? undefined}
          />
        )}
      </Card>

              {/* Arena Billboard Modal */}
              <ArenaBillboardChatPanel
                isOpen={isBillboardOpen}
                onClose={() => setBillboardOpen(false)}
                privateChallengeId={challengeId}
              />
              
              {/* Emoji Tray */}
              {emojiEnabled && (
                <EmojiTray
                  open={trayOpen}
                  onToggle={() => setTrayOpen(v => !v)}
                  onReact={handleReactUser}
                />
              )}
            </>
          )}
        </>
      ) : (
        <ArenaSkeleton />
      )}
      <ArenaSmokeTester />
    </section>
  );
};