
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { members, loading, error, refresh } = useRank20Members();
  const isMobile = useIsMobile();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isArenaChatOpen, setArenaChatOpen] = useState(false);
  
  // Simple scores state for enrichment (no separate leaderboard state)
  const [scores, setScores] = useState<Record<string, {score: number; rank?: number}>>({});
  
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

  // Build a lookup of stats by user_id (if stats exist elsewhere in this component)
  const scoresById: Record<string, { score?: number; streak?: number }> = useMemo(() => {
    const list = Array.isArray(scores) ? Object.values(scores) : []; // keep your existing "scores" source if present
    const map: Record<string, { score?: number; streak?: number }> = {};
    for (const s of list) {
      if (!s?.user_id) continue;
      map[s.user_id] = { score: s.score ?? 0, streak: s.streak ?? 0 };
    }
    return map;
  }, [scores]);

  // LEFT-JOIN semantics: render *all* members; fill missing stats with 0
  const rows = (Array.isArray(members) ? members : []).map((m) => {
    const s = scoresById[m.user_id] ?? {};
    return {
      user_id: m.user_id,
      display_name: m.display_name || `User ${String(m.user_id).slice(0, 5)}`,
      avatar_url: m.avatar_url ?? null,
      joined_at: m.joined_at,
      score: s.score ?? 0,
      streak: s.streak ?? 0,
    };
  });

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info('[Arena rows]', rows.length, rows.slice(0,3));
    const countNow = document.querySelectorAll('[data-testid="arena-item"]').length;
    console.info('[Arena DOM now]', countNow);
    setTimeout(() => {
      const countLater = document.querySelectorAll('[data-testid="arena-item"]').length;
      console.info('[Arena DOM +3s]', countLater);
    }, 3000);
  }


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
    <Card className="overflow-hidden border-2 border-blue-200 shadow-xl">
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
            isMobile ? "text-xl" : "text-3xl gap-3"
          )}>
            <Users className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-blue-600")} />
            👥 Friends Arena
            <Users className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-blue-600")} />
          </CardTitle>
          
          <div className="flex gap-2">
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
      
      <CardContent className={cn(isMobile ? "p-3" : "p-6")}>
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
        ) : Array.isArray(members) && members.length === 0 ? (
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
          <>
            {isMobile ? (
              // Mobile: Vertical Stack Layout
              <div 
                data-testid="arena-list"
                className="flex flex-col gap-2 overflow-visible min-h-0"
                style={{ maxHeight: 'none' }}
              >
                {rows.map((member, index) => (
                  <div data-testid="arena-item" key={member.user_id}>
                    <Card 
                        className="border-2 border-muted hover:border-primary/40 transition-all duration-300 cursor-pointer"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                <ProgressAvatar 
                                  avatar="👤"
                                  nickname={member.display_name || `User ${member.user_id.slice(0, 5)}`}
                                  weeklyProgress={0}
                                  dailyStreak={0}
                                  weeklyStreak={0}
                                  size="sm"
                                  showStats={false}
                                  isCurrentUser={false}
                                />
                               <div>
                                <span className="text-xs text-muted-foreground">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
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
            ) : (
              // Desktop: Horizontal Grid Layout  
              <div 
                data-testid="arena-list"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 overflow-visible min-h-0"
                style={{ maxHeight: 'none' }}
              >
                {rows.map((member, index) => (
                  <div data-testid="arena-item" key={member.user_id}>
                    <Card 
                        className="border-2 border-muted hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden"
                      >
                        {/* Rank Badge Overlay */}
                        <div className="absolute top-2 right-2 z-10">
                          {getRankBadge(index + 1)}
                        </div>
                        
                        <CardContent className="p-4">
                           <div className="flex items-center gap-3 mb-4">
                              <ProgressAvatar 
                                avatar="👤"
                                nickname={member.display_name || `User ${member.user_id.slice(0, 5)}`}
                                weeklyProgress={0}
                                dailyStreak={0}
                                weeklyStreak={0}
                                size="md"
                                showStats={false}
                                isCurrentUser={false}
                              />
                             <div className="flex-1">
                               <span className="text-xs text-muted-foreground">
                                 Joined {new Date(member.joined_at).toLocaleDateString()}
                               </span>
                             </div>
                           </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="font-medium">Rank: #{index + 1}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">Arena Member</span>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle challenge friend
                                }}
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Challenge
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle message friend
                                }}
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Message
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </>
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
  );
};
