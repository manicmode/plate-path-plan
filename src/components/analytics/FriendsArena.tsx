import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

interface FriendsArenaProps {
  friends?: any[]; // Keep for compatibility but unused
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

  const rows = useMemo(
    () =>
      (Array.isArray(members) ? members : []).map((m) => ({
        user_id: m.user_id,
        display_name:
          m.display_name?.trim() ? m.display_name.trim() : `User ${String(m.user_id).slice(0, 5)}`,
        avatar_url: m.avatar_url ?? null,
        joined_at: m.joined_at,
        score: 0,
        streak: 0,
      })),
    [members]
  );

  if (process.env.NODE_ENV !== 'production') {
    console.info('[Arena rows]', rows.length, rows.slice(0,3));
  }

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-red-500">Failed to load arena.</div>;
  if (!rows.length) return <div>No arena buddies yet</div>;

  return (
    <Card className="overflow-visible border-2 shadow-xl relative border-primary/20">
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
        <div className="my-3">
          <button
            type="button"
            onClick={() => {
              navigate("/chat?channel=arena"); 
            }}
            className="w-full rounded-full px-4 py-3 text-sm md:text-base font-medium
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
        
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <div key={row.user_id}>
              <Card className="border border-muted/50 hover:border-primary/30 transition-colors bg-gradient-to-r from-background to-muted/20">
                <CardContent 
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
                    <div className="flex items-center gap-3">
                      <Avatar className={cn(isMobile ? "h-10 w-10" : "h-12 w-12")}>
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {row.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground">
                          {row.display_name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {row.streak} day streak
                          <Target className="h-3 w-3 text-blue-500 ml-2" />
                          {row.score} pts
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        Rising
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
  );
};