import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  TrendingUp, 
  Trophy,
  Target,
  Flame,
  Crown,
  Medal,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

import { useRank20Members } from '@/hooks/arena/useRank20Members';
import { useRank20ChallengeId } from '@/hooks/arena/useRank20ChallengeId';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { fetchUserStats, type UserStats } from '@/hooks/arena/useUserStats';
import { supabase } from '@/integrations/supabase/client';
import ArenaBillboardChatPanel from '@/components/arena/ArenaBillboardChatPanel';
import { useAuth } from '@/contexts/auth';
import ArenaSkeleton from '@/components/arena/ArenaSkeleton';

// Pretty numbers (e.g., 2,432)
const nf = new Intl.NumberFormat();
const formatNumber = (n?: number | null) => nf.format(Math.max(0, Number(n ?? 0)));

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

export const FriendsArena: React.FC<FriendsArenaProps> = ({ friends = [] }) => {
  const { user } = useAuth();
  const { data: members = [], isLoading: loading, error, refetch: refresh } = useRank20Members(user?.id);
  const { challengeId } = useRank20ChallengeId();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<null | {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>(null);
  
  // Leaderboard data using server-side function
  const [leaderboard, setLeaderboard] = useState<Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    streak: number;
  }>>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Billboard modal state
  const [isBillboardOpen, setBillboardOpen] = useState(false);

  // Use leaderboard data directly from server function
  const rows = useMemo(() => {
    return leaderboard.map(item => ({
      user_id: item.user_id,
      display_name: item.display_name,
      avatar_url: item.avatar_url,
      joined_at: null, // Not needed for display
      score: item.points,
      streak: item.streak,
    }));
  }, [leaderboard]);

  // Anti-flicker loading state with grace period
  const ready = !loading && !leaderboardLoading && !!challengeId && rows.length > 0;
  const [showContent, setShowContent] = React.useState(false);
  
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

  // Load leaderboard using server function that enforces group membership
  useEffect(() => {
    let cancelled = false;
    
    const loadLeaderboard = async () => {
      if (!user?.id) return;
      
      // Invalidate any prior leaderboard cache on Arena tab mount/open
      setLeaderboard([]);
      setLeaderboardLoading(true);
      try {
        const { data, error } = await supabase.rpc('my_rank20_leaderboard');
        
        if (error) {
          console.error('[Arena] Leaderboard error:', error);
          return;
        }
        
        if (!cancelled) {
          const leaderboardData = (data || []).map((row: any) => ({
            user_id: row.user_id,
            display_name: row.display_name || `User ${row.user_id.slice(0, 5)}`,
            avatar_url: row.avatar_url,
            points: row.points || 0,
            streak: row.streak || 0,
          }));
          
          setLeaderboard(leaderboardData);
          
          // Dev diagnostics - log once on Arena tab mount/open
          if (process.env.NODE_ENV !== 'production') {
            console.info('[Arena] Arena opened:', {
              groupId: members[0]?.group_id,
              isInArena: members.length > 0,
              chatRows: 'N/A', // Available in ArenaBillboardChatPanel
              leaderboardRows: leaderboardData.length
            });
          }
        }
      } catch (error) {
        console.error('[Arena] Leaderboard fetch error:', error);
      } finally {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      }
    };

    loadLeaderboard();
    return () => { cancelled = true; };
  }, [user?.id, members.length]);


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
          {error ? (
            <div className="text-destructive">Failed to load arena.</div>
          ) : !rows.length ? (
            <div className="text-muted-foreground">No arena buddies yet</div>
          ) : (
            <>
              <div className="mt-3 mb-8">
                <button
                  type="button"
                  onClick={() => {
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
              Live Rankings Arena
              <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {rows.length} members
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
          <div className="flex flex-col gap-5">
          {rows.map((row, index) => (
            <div key={row.user_id} className="relative rounded-2xl dark:bg-slate-800/60 bg-slate-100/60 border dark:border-slate-700/70 border-slate-200/70 overflow-visible">
              {/* Off-card rank badge */}
              <span
                aria-label={`Rank ${index + 1}`}
                className="pointer-events-none absolute -left-3 -top-3 z-20 select-none rounded-full px-2 py-0.5 text-xs font-bold text-black shadow-md bg-gradient-to-r from-amber-400 to-orange-500"
              >
                #{index + 1}
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
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span className="font-semibold">{row.streak ?? 0}</span>
                        <span className="text-muted-foreground text-xs">streak</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Robust points layout */}
                  <div className="ml-auto min-w-[84px] text-right tabular-nums mt-6">
                    <div className="inline-flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span className="font-semibold">{formatNumber(row.score)}</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
            </>
          )}
        </>
      ) : (
        <ArenaSkeleton />
      )}
    </section>
  );
};