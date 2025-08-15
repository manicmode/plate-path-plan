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
import ArenaBillboardChatPanel from '@/components/arena/ArenaBillboardChatPanel';

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
  const { members, loading, error, refresh } = useRank20Members();
  const { challengeId } = useRank20ChallengeId();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<null | {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>(null);
  
  // Stats cache for all members
  const [statsById, setStatsById] = useState<Record<string, UserStats>>({});

  // Billboard modal state
  const [isBillboardOpen, setBillboardOpen] = useState(false);

  // Preload stats for all members
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = (Array.isArray(members) ? members : []).map(m => m.user_id);
      // Fetch in parallel; reuse modal's fetch logic
      const entries = await Promise.all(ids.map(async (id) => {
        try { 
          return [id, await fetchUserStats(id)] as const; 
        } catch { 
          return [id, { score: 0, streak: 0 }] as const; 
        }
      }));
      if (!cancelled) {
        const next: Record<string, UserStats> = {};
        for (const [id, s] of entries) next[id] = s;
        setStatsById(next);
      }
    })();
    return () => { cancelled = true; };
  }, [members]);

  // Build rows with real stats and sort by score for ranking
  const rows = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    // Inject stats from cache and sort for rank badges
    const withStats = list.map(m => {
      const s = statsById[m.user_id] ?? { score: 0, streak: 0 };
      return {
        user_id: m.user_id,
        display_name: m.display_name?.trim() ? m.display_name.trim() : `User ${String(m.user_id).slice(0, 5)}`,
        avatar_url: m.avatar_url ?? null,
        joined_at: m.joined_at,
        score: s.score ?? 0,
        streak: s.streak ?? 0,
      };
    });
    // Sort by score desc, then joined_at asc for stable rank numbers
    withStats.sort((a, b) => 
      (b.score ?? 0) - (a.score ?? 0) || 
      (a.joined_at ? new Date(a.joined_at).getTime() : 0) - (b.joined_at ? new Date(b.joined_at).getTime() : 0)
    );
    return withStats;
  }, [members, statsById]);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[Arena rows]', rows.length, rows.slice(0,3));
  }

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-500">Failed to load arena.</div>;
  if (!rows.length) return <div>No arena buddies yet</div>;

  return (
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
  );
};