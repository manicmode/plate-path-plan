
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  MessageCircle, 
  UserPlus, 
  Trophy,
  Target,
  Calendar,
  Flame,
  Crown,
  Medal,
  Star,
  Zap,
  Gift,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProgressAvatar } from './ui/ProgressAvatar';
import { useRank20Members } from '@/hooks/arena/useRank20Members';
import { supabase } from '@/integrations/supabase/client';
import ArenaBillboardChatPanel from '@/components/arena/ArenaBillboardChatPanel';
import { requireSession } from '@/lib/ensureAuth';
import ArenaSmoke from "@/components/analytics/ArenaSmoke";

interface Friend {
  id: number;
  nickname: string;
  avatar: string;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  score: number;
  streak: number;
  weeklyProgress: number;
  isOnline: boolean;
  lastSeen: string;
}

interface FriendsArenaProps {
  friends?: Friend[]; // Now optional since we use RPC data
}

export const FriendsArena: React.FC<FriendsArenaProps> = ({ friends = [] }) => {
  useEffect(() => { console.info("[SOURCE] FriendsArena rendered"); }, []);

  const rawSearch = typeof window !== "undefined" ? window.location.search : "";
  const qs = new URLSearchParams(rawSearch);
  const urlFlag = qs.get("arena_smoke") === "1";
  const lsFlag  = typeof window !== "undefined" ? window.localStorage.getItem("arena_smoke") === "1" : false;

  if (urlFlag && typeof window !== "undefined") {
    try { window.localStorage.setItem("arena_smoke", "1"); } catch {}
  }

  const ARENA_SMOKE = urlFlag || lsFlag;

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[ARENA_SMOKE] flags =>", { urlFlag, lsFlag, ARENA_SMOKE, rawSearch });
  }

  // Dev keyboard toggle: Shift+S
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && e.shiftKey) {
        const cur = localStorage.getItem("arena_smoke") === "1";
        localStorage.setItem("arena_smoke", cur ? "" : "1");
        window.location.reload();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (ARENA_SMOKE) {
    return (
      <div style={{ padding: 16 }}>
        <ArenaSmoke />
        {/* Render the normal arena below too so we can compare */}
      </div>
    );
  }

  const navigate = useNavigate();
  const location = useLocation();
  const { members, loading, error, refresh } = useRank20Members();
  const isMobile = useIsMobile();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isArenaChatOpen, setArenaChatOpen] = useState(false);
  
  
  // Enroll in Rank-of-20 on mount (silent, no navigation) 
  useEffect(() => {
    (async () => {
      try { 
        await requireSession();
        await supabase.rpc('rank20_enroll_me'); // safe to call repeatedly
        refresh(); // Refresh members list after enrollment
      } catch (e) { 
        // Silent fail for enrollment
      }
    })(); 
  }, [refresh]);

  // REPLACE the existing scoresById + rows logic with this:
  const rows = useMemo(
    () =>
      (Array.isArray(members) ? members : []).map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name?.trim() ? m.display_name : `User ${String(m.user_id).slice(0, 5)}`,
        avatar_url: m.avatar_url ?? null,
        joined_at: m.joined_at,
        // default stats to avoid dropping rows when stats are absent
        score: 0,
        streak: 0,
      })),
    [members]
  );

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info(
      '[Arena] rpc members',
      Array.isArray(members) ? members.length : members,
      Array.isArray(members) ? members.map(m => m.user_id) : []
    );
    // eslint-disable-next-line no-console
    console.info('[Arena] rows', rows.length, rows.map(r => r.user_id));
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[Arena] rows.len", rows.length, rows.map(r => r.user_id));
  }

  const inDev = true; // TEMP: force-visible debug UI
  const params = new URLSearchParams(location.search);
  const arenaPlain = params.get("arena_plain") === "1";

  if (params.get("arena_smoke") === "1") {
    return <ArenaSmoke />;
  }
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (!p.get("arena_plain")) {
      p.set("arena_plain", "1");
      navigate({ pathname: location.pathname, search: p.toString() }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dev: helper to flip mode without touching URL manually
  const setArenaPlain = (on: boolean) => {
    const p = new URLSearchParams(location.search);
    if (on) p.set("arena_plain", "1"); else p.delete("arena_plain");
    navigate({ pathname: location.pathname, search: p.toString() }, { replace: true });
  };

  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info("[ARENA DEBUG] mounted: rows=", rows.length, "plain?", arenaPlain);
  }

  const arenaOverlay = typeof document !== "undefined"
    ? createPortal(
        <div
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 2147483647, // on top of everything
            background: "rgba(16, 185, 129, 0.92)",
            color: "#04130d",
            border: "2px solid #10b981",
            borderRadius: 10,
            padding: "8px 10px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            fontSize: 12,
            lineHeight: 1.1,
          }}
          data-testid="arena-debug-overlay"
        >
          <div style={{fontWeight: 700, marginBottom: 6}}>Arena Debug</div>
          <div style={{display: "flex", gap: 6, marginBottom: 6}}>
            <button onClick={() => setArenaPlain(false)} style={{padding: "4px 8px", borderRadius: 6, border: "1px solid #064e3b", background: arenaPlain ? "transparent" : "#34d399"}}>
              Cards
            </button>
            <button onClick={() => setArenaPlain(true)} style={{padding: "4px 8px", borderRadius: 6, border: "1px solid #064e3b", background: arenaPlain ? "#34d399" : "transparent"}}>
              Plain
            </button>
          </div>
          <div>rows: <strong>{rows.length}</strong></div>
          <div>mode: <strong>{arenaPlain ? "plain" : "cards"}</strong></div>
        </div>,
        document.body
      )
    : null;

  const content = arenaPlain ? (
    <div className="p-3">
      <ul className="list-disc pl-5 space-y-1">
        {rows.map(r => <li key={r.user_id}>{r.display_name} — {r.user_id}</li>)}
      </ul>
    </div>
  ) : (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.user_id}>
          <Card className="border-2 border-muted hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <ProgressAvatar 
                    avatar="👤"
                    nickname={row.display_name}
                    weeklyProgress={0}
                    dailyStreak={0}
                    weeklyStreak={0}
                    size="sm"
                    showStats={false}
                    isCurrentUser={false}
                  />
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(row.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {getRankBadge(index + 1)}
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Rank: #{index + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span>Active Member</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );


  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const getOnlineStatus = (isOnline: boolean, lastSeen: string) => {
    if (isOnline) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">🟢 Online</Badge>;
    }
    return <span className="text-xs text-muted-foreground">Last seen {lastSeen}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-yellow-900"><Crown className="h-3 w-3 mr-1" />1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-gray-900"><Medal className="h-3 w-3 mr-1" />2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-amber-100"><Star className="h-3 w-3 mr-1" />3rd</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  return (
    <>
      {arenaOverlay}
    <Card className="w-full h-auto overflow-visible border-2 border-blue-200 shadow-xl relative">
      <div style={{
        position: "absolute",
        top: 6,
        right: 8,
        zIndex: 5,
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        borderRadius: 6,
        padding: "2px 6px",
        fontSize: 11,
      }}>
        SOURCE: FriendsArena
      </div>
      <CardHeader className={cn(
        "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
        isMobile ? "p-4" : "p-6"
      )}>
        <div className={cn(
          "flex items-center",
          isMobile ? "flex-col space-y-2" : "justify-between"
        )}>
          {/* LEFT: existing title/icons */}
          <div className="flex items-center gap-2">
            <CardTitle className={cn(
              "font-bold flex items-center gap-2",
              isMobile ? "text-xl" : "text-3xl gap-3"
            )}>
              <Users className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-blue-600")} />
              Live Rankings Arena
              {arenaPlain && (
                <span className="ml-2 px-2 py-0.5 rounded-md border border-emerald-500 text-emerald-300 text-[10px]">
                  PLAIN MODE — rows={rows.length}
                </span>
              )}
            </CardTitle>
          </div>

          {/* RIGHT: TOOLBAR AND ACTIONS */}
          <div className="flex items-center gap-2">
            {/* ALWAYS-VISIBLE TOOLBAR */}
            <div
              data-testid="arena-toolbar"
              className="flex items-center gap-2 text-[10px] sm:text-xs px-2 py-1 rounded-md border border-emerald-500 bg-emerald-500/15 text-emerald-300"
            >
              <button
                onClick={() => setArenaPlain(false)}
                className={!arenaPlain ? "px-2 py-0.5 rounded border bg-emerald-500/30" : "px-2 py-0.5 rounded border"}
              >
                Cards
              </button>
              <button
                onClick={() => setArenaPlain(true)}
                className={arenaPlain ? "px-2 py-0.5 rounded border bg-emerald-500/30" : "px-2 py-0.5 rounded border"}
              >
                Plain
              </button>
              <span className="ml-2 px-2 py-0.5 rounded border">rows={rows.length}</span>
            </div>

            {/* ACTION BUTTONS */}
            <Button 
              onClick={() => setArenaChatOpen(true)}
              className={cn(
                "flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg",
                isMobile ? "h-8 px-3 text-xs" : ""
              )}
              size={isMobile ? "sm" : "default"}
            >
              <MessageCircle className="h-4 w-4" />
              <span className={isMobile ? "text-xs" : ""}>Billboard & Chat</span>
            </Button>
            <Button 
              onClick={() => setShowInviteModal(true)}
              className={cn(
                "flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg",
                isMobile ? "h-8 px-3 text-xs" : ""
              )}
              size={isMobile ? "sm" : "default"}
            >
              <UserPlus className="h-4 w-4" />
              <span className={isMobile ? "text-xs" : ""}>Invite Friends</span>
            </Button>
          </div>
        </div>
        <p className={cn(
          "text-muted-foreground",
          isMobile ? "text-sm text-center" : "mt-2"
        )}>
          Challenge your friends and climb the leaderboard together!
        </p>
      </CardHeader>
      
      <CardContent className={cn("w-full h-auto overflow-visible", isMobile ? "p-3" : "p-6")}>
        {/* === ARENA INLINE DEBUG (always visible) === */}
        <div
          data-testid="arena-debug-inline"
          style={{
            background: '#111827',
            border: '2px dashed #fbbf24',
            color: '#fde68a',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>ARENA DEBUG</div>
          <div style={{ marginBottom: 6 }}>
            members=<b>{Array.isArray(members) ? members.length : 'n/a'}</b>{' '}
            rows=<b>{rows.length}</b>
          </div>
          <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0, maxHeight: 160, overflow: 'auto' }}>
            {rows.map((r) => (
              <li key={'dump-' + r.user_id}>
                {r.user_id} — {r.display_name || 'N/A'}
              </li>
            ))}
          </ul>
        </div>
        {/* === /ARENA INLINE DEBUG === */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive text-sm">{error}</p>
            <Button onClick={refresh} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm opacity-80">
            <div className="font-medium mb-1">No arena buddies yet</div>
            <div className="mb-3">Join or invite friends to a Rank-of-20 challenge to see live rankings here.</div>
            <div className="flex gap-2">
              <button
                className="rounded-lg border px-3 py-1.5"
                onClick={() => navigate('/challenges/new?type=rank_of_20')}
              >
                Start a Live Arena
              </button>
              <button
                className="rounded-lg border px-3 py-1.5"
                onClick={() => navigate('/friends')}
              >
                Invite friends
              </button>
            </div>
          </div>
        ) : (
          content
        )}

        {rows.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className={cn(
              "bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4",
              isMobile ? "w-16 h-16" : "w-20 h-20"
            )}>
              <Users className={cn(isMobile ? "h-8 w-8" : "h-10 w-10", "text-blue-600")} />
            </div>
            <h3 className={cn("font-semibold mb-2", isMobile ? "text-lg" : "text-xl")}>
              No Friends Yet
            </h3>
            <p className={cn("text-muted-foreground mb-4", isMobile ? "text-sm" : "")}>
              Invite friends to make your health journey more fun and competitive!
            </p>
            <Button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2"
              size={isMobile ? "sm" : "default"}
            >
              <UserPlus className="h-4 w-4" />
              Invite Your First Friend
            </Button>
          </div>
        )}
      </CardContent>

      {/* Friend Detail Modal */}
      {selectedFriend && (
        <Dialog open={!!selectedFriend} onOpenChange={() => setSelectedFriend(null)}>
          <DialogContent className={cn(isMobile ? "max-w-sm" : "max-w-md")}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedFriend.avatar}</span>
                {selectedFriend.nickname}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getRankBadge(selectedFriend.rank)}
                {getOnlineStatus(selectedFriend.isOnline, selectedFriend.lastSeen)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-bold text-lg">{selectedFriend.score}</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-bold text-lg flex items-center justify-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {selectedFriend.streak}
                  </div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Weekly Progress</span>
                  <span className="font-medium">{selectedFriend.weeklyProgress}%</span>
                </div>
                <Progress value={selectedFriend.weeklyProgress} className="h-3" />
              </div>
              
              <div className="flex gap-2">
                <Button className="flex-1" size={isMobile ? "sm" : "default"}>
                  <Target className="h-4 w-4 mr-2" />
                  Challenge Friend
                </Button>
                <Button variant="outline" className="flex-1" size={isMobile ? "sm" : "default"}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Friends Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className={cn(isMobile ? "max-w-sm" : "max-w-md")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Friends
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Share your referral code or invite friends via social media to join the challenge!
            </p>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Your Referral Code</div>
              <div className="text-2xl font-bold font-mono">HEALTH24</div>
              <Button variant="outline" size="sm" className="mt-2">
                Copy Code
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">Share on WhatsApp</Button>
              <Button variant="outline" size="sm">Share on Instagram</Button>
              <Button variant="outline" size="sm">Share on Facebook</Button>
              <Button variant="outline" size="sm">Copy Link</Button>
            </div>
            
            <Button className="w-full">
              <Gift className="h-4 w-4 mr-2" />
              Send Invitations
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Arena Billboard Chat Panel */}
      <ArenaBillboardChatPanel 
        isOpen={isArenaChatOpen}
        onClose={() => setArenaChatOpen(false)}
      />
    </Card>
    </>
  );
};
