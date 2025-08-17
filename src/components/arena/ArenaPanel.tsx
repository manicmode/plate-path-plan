import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trophy, Users, Target, Flame, TrendingUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArenaActive, useArenaMembers, useArenaLeaderboardWithProfiles } from '@/hooks/useArena';
import ArenaBillboardChatPanel from './ArenaBillboardChatPanel';

// Helper to get user initials
function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0]?.toUpperCase() || '';
  const last = parts[1]?.[0]?.toUpperCase() || '';
  return (first + last) || first || '?';
}

// Format points with commas
function formatPoints(points: number) {
  return new Intl.NumberFormat().format(points);
}

export default function ArenaPanel() {
  const [isBillboardOpen, setIsBillboardOpen] = useState(false);
  
  // V2 Arena hooks
  const { groupId, isLoading: loadingActive } = useArenaActive();
  const { members, isLoading: membersLoading } = useArenaMembers(groupId);
  const { leaderboard, isLoading: leaderboardLoading } = useArenaLeaderboardWithProfiles(groupId);

  // Mock data for demonstration matching the screenshot
  const mockLeaderboard = [
    {
      user_id: 'ashkan',
      display_name: 'ashkan',
      avatar_url: '/lovable-uploads/02c6ca80-7ef7-406d-aa56-c6972fd55eb7.png', // Using the uploaded image
      score: 2432,
      rank: 1,
      streak: 2
    },
    {
      user_id: 'ashi-mashi', 
      display_name: 'Ashi Mashi',
      avatar_url: null,
      score: 0,
      rank: 2,
      streak: 0
    },
    {
      user_id: 'deborah',
      display_name: 'Deborah', 
      avatar_url: null,
      score: 0,
      rank: 3,
      streak: 0
    }
  ];

  // Use mock data for demo, fallback to real data
  const displayLeaderboard = mockLeaderboard.length > 0 ? mockLeaderboard : leaderboard || [];
  const memberCount = mockLeaderboard.length || members?.length || 3;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Purple Billboard & Chat Pill */}
      <Button
        onClick={() => setIsBillboardOpen(true)}
        className="w-full h-16 rounded-3xl bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white text-lg font-semibold shadow-lg transition-all duration-200"
      >
        <MessageCircle className="mr-3 h-6 w-6" />
        Billboard & Chat
      </Button>

      {/* Live Rankings Arena Card */}
      <Card className="bg-slate-900 border-slate-700 rounded-3xl shadow-xl">
        <CardContent className="p-6">
          {/* Title with trophies */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-white">Live Rankings Arena</h2>
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            
            {/* Member count badge */}
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-600">
              <Users className="h-3 w-3 mr-1" />
              {memberCount} members
            </Badge>
          </div>

          {/* Rankings List */}
          <div className="space-y-4">
            {displayLeaderboard.map((member, index) => (
              <div
                key={member.user_id}
                className="relative flex items-center bg-slate-800 rounded-2xl p-4 border border-slate-700"
              >
                {/* Rank Badge */}
                <div className="absolute -left-2 -top-2 z-10">
                  <Badge className="bg-orange-500 text-black font-bold px-2 py-1 rounded-full border-2 border-slate-900">
                    #{member.rank}
                  </Badge>
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12 mr-4">
                  {member.avatar_url ? (
                    <AvatarImage src={member.avatar_url} alt={member.display_name} />
                  ) : (
                    <AvatarFallback className="bg-teal-600 text-white font-semibold">
                      {getInitials(member.display_name)}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* User info */}
                <div className="flex-1">
                  <div className="font-medium text-white">{member.display_name}</div>
                  <div className="flex items-center text-sm text-slate-400">
                    <Flame className="h-3 w-3 mr-1 text-orange-500" />
                    {(member as any).streak || 0} streak
                  </div>
                </div>

                {/* Status and points */}
                <div className="text-right">
                  <div className="flex items-center text-sm text-green-500 mb-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Rising
                  </div>
                  <div className="flex items-center text-white">
                    <Target className="h-4 w-4 mr-1 text-slate-400" />
                    <span className="text-lg font-bold">{formatPoints(member.score)}</span>
                    <span className="text-sm text-slate-400 ml-1">pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billboard & Chat Modal */}
      <Dialog open={isBillboardOpen} onOpenChange={setIsBillboardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <ArenaBillboardChatPanel 
            isOpen={isBillboardOpen}
            onClose={() => setIsBillboardOpen(false)}
            privateChallengeId={groupId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}