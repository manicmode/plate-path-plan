import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { fetchUserStats, type UserStats } from '@/hooks/arena/useUserStats';

// Pretty numbers (e.g., 2,432)
const nf = new Intl.NumberFormat();
const formatNumber = (n?: number | null) => nf.format(Math.max(0, Number(n ?? 0)));

interface FriendsArenaProps {
  friends?: any[]; // Keep for compatibility but unused
}

// Helper functions
function getInitials(name?: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

function formatPoints(n: number) {
  return n.toLocaleString();
}

export const FriendsArena: React.FC<FriendsArenaProps> = ({ friends = [] }) => {
  const { members, loading, error, refresh } = useRank20Members();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<null | {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>(null);
  
  // Stats cache for all members
  const [statsById, setStatsById] = useState<Record<string, UserStats>>({});

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
        <Button
          className="max-w-[640px] w-[92%] md:w-[80%] mx-auto rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500"
          onClick={() => navigate('/game-and-challenge/billboard')}
        >
          🗨️  Billboard & Chat
        </Button>
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
          {/* list wrapper */}
          <div className="flex flex-col space-y-4 pt-2">
            {rows.map((m, idx) => (
              <Card
                key={m.user_id}
                className="relative bg-card/70"
                onClick={() => setSelected({ 
                  user_id: m.user_id, 
                  display_name: m.display_name, 
                  avatar_url: m.avatar_url 
                })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected({ 
                      user_id: m.user_id, 
                      display_name: m.display_name, 
                      avatar_url: m.avatar_url 
                    });
                  }
                }}
              >
                {/* rank chip — lifted a bit and nudged left, half outside */}
                <div className="absolute -top-3 -left-2 z-10">
                  <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-2 py-1 shadow">
                    #{idx + 1}
                  </span>
                </div>

                <CardContent className="p-5 pr-24 min-h-[92px]">
                  <div className="flex items-center gap-4">
                    {/* avatar / initials */}
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-1 ring-white/10">
                        {m.avatar_url ? (
                          <AvatarImage src={m.avatar_url} alt={m.display_name} />
                        ) : (
                          <AvatarFallback className="text-sm">
                            {getInitials(m.display_name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>

                    {/* name + small stats */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{m.display_name}</div>
                      <div className="text-xs opacity-80 flex items-center gap-4 mt-1">
                        <span title="streak">
                          🔥 {m.streak ?? 0} <span className="hidden sm:inline">streak</span>
                        </span>
                        <span className="flex items-center gap-1" title="points">
                          <Target className="h-3.5 w-3.5" />
                          {formatPoints(m.score ?? 0)} <span className="hidden sm:inline">pts</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* trend chip pinned top-right inside safe area, never overlaps points */}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">
                    ↗︎ Rising
                  </Badge>
                </div>
              </Card>
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
    </>
  );
};