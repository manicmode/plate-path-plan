import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Trophy, Users, Target, Flame, TrendingUp, MessageCircle, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { useArenaActive, useArenaMembers, useArenaLeaderboardWithProfiles } from '@/hooks/useArena';
import ArenaBillboardChatPanel from './ArenaBillboardChatPanel';
import SectionDivider from '@/components/arena/SectionDivider';

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
  return new Intl.NumberFormat().format(Math.round(points));
}

// Profile Quick View Sheet Component
interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
    score: number;
    streak?: number;
  } | null;
  onMentionInChat: (name: string) => void;
  currentFacet: 'combined' | 'nutrition' | 'exercise' | 'recovery';
}

function ProfileSheet({ isOpen, onClose, user, onMentionInChat, currentFacet }: ProfileSheetProps) {
  if (!user) return null;

  const handleMentionInChat = () => {
    onMentionInChat(user.display_name);
    onClose();
  };

  const getFacetLabel = (facet: string) => {
    switch (facet) {
      case 'nutrition': return 'Nutrition';
      case 'exercise': return 'Exercise';
      case 'recovery': return 'Recovery';
      default: return 'Total';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[60vh]">
        <SheetHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-20 w-20">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.display_name} />
              ) : (
                <AvatarFallback className="bg-teal-600 text-white text-xl font-semibold">
                  {getInitials(user.display_name)}
                </AvatarFallback>
              )}
            </Avatar>
            <SheetTitle className="text-2xl">{user.display_name}</SheetTitle>
            
            <div className="flex items-center space-x-4 text-lg">
              <div className="flex items-center">
                <Flame className="h-5 w-5 mr-1 text-orange-500" />
                <span className="text-muted-foreground">{user.streak || 0} streak</span>
              </div>
              
              <div className="flex items-center">
                <Target className="h-5 w-5 mr-1 text-primary" />
                <span className="font-bold">{formatPoints(user.score)}</span>
                <span className="text-muted-foreground ml-1">{getFacetLabel(currentFacet)} pts</span>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <Button variant="outline" onClick={onClose}>
                View Full Profile
              </Button>
              <Button onClick={handleMentionInChat} className="flex items-center">
                <AtSign className="h-4 w-4 mr-2" />
                Mention in Chat
              </Button>
            </div>
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

export default function ArenaPanel() {
  const [isBillboardOpen, setIsBillboardOpen] = useState(false);
  const [selectedFacet, setSelectedFacet] = useState<'combined' | 'nutrition' | 'exercise' | 'recovery'>('combined');
  const [sortBy, setSortBy] = useState('score');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  
  // V2 Arena hooks with facet support
  const { groupId, isLoading: loadingActive } = useArenaActive();
  const { members, isLoading: membersLoading } = useArenaMembers(groupId);
  const { leaderboard, isLoading: leaderboardLoading } = useArenaLeaderboardWithProfiles(groupId, selectedFacet);

  // Handle avatar click
  const handleAvatarClick = (member: any) => {
    // Find the member's score from leaderboard
    const leaderboardEntry = leaderboard.find(l => l.user_id === member.user_id);
    setSelectedProfile({
      ...member,
      score: leaderboardEntry?.score || 0,
      streak: leaderboardEntry?.streak || 0,
    });
    setIsProfileSheetOpen(true);
  };

  // Handle mention in chat 
  const handleMentionInChat = (name: string) => {
    // Open the billboard chat and prefill @name
    setIsBillboardOpen(true);
    // This would need to be passed to the chat component to prefill the input
    setTimeout(() => {
      const chatInput = document.querySelector('[data-testid="arena-chat-input"]') as HTMLInputElement;
      if (chatInput) {
        chatInput.value = `@${name} `;
        chatInput.focus();
      }
    }, 100);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Segmented Control Tabs */}
      <div className="flex justify-center">
        <ToggleGroup 
          type="single" 
          value={selectedFacet} 
          onValueChange={(value) => {
            if (value) {
              setSelectedFacet(value as 'combined' | 'nutrition' | 'exercise' | 'recovery');
            }
          }}
          className="bg-muted/50 rounded-full p-1"
        >
          <ToggleGroupItem 
            value="nutrition" 
            className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-muted-foreground data-[state=on]:text-muted data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
          >
            Nutrition
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="exercise" 
            className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-muted-foreground data-[state=on]:text-muted data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
          >
            Exercise
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="recovery" 
            className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-muted-foreground data-[state=on]:text-muted data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
          >
            Recovery
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="combined" 
            className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-gradient-to-r data-[state=on]:from-cyan-400 data-[state=on]:to-cyan-500 data-[state=on]:text-white data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
          >
            Combined
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">Sort:</span>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            <SelectItem value="score">Score</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-white">Live Rankings Arena</h2>
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            
            {/* Member count badge */}
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-600">
              <Users className="h-3 w-3 mr-1" />
              {members?.length || 0} members
            </Badge>
          </div>

          {/* Section Divider */}
          <SectionDivider title="LIVE RANKINGS ARENA" />

          {/* Member Avatars Row */}
          {members && members.length > 0 && (
            <div className="flex justify-center space-x-2 mb-6">
              {members.slice(0, 6).map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleAvatarClick(member)}
                  className="transition-transform hover:scale-110"
                >
                  <Avatar className="h-10 w-10 border-2 border-slate-600">
                    {member.avatar_url ? (
                      <AvatarImage src={member.avatar_url} alt={member.display_name} />
                    ) : (
                      <AvatarFallback className="bg-teal-600 text-white text-sm font-semibold">
                        {getInitials(member.display_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              ))}
              {members.length > 6 && (
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-700 border-2 border-slate-600">
                  <span className="text-xs text-slate-300 font-medium">+{members.length - 6}</span>
                </div>
              )}
            </div>
          )}

          {/* Rankings List */}
          <div className="space-y-4">
            {leaderboardLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-slate-400 text-sm">
                  No rankings yet. Start earning points to appear on the leaderboard!
                </div>
              </div>
            ) : (
              leaderboard.slice(0, 3).map((member, index) => (
                <button
                  key={member.user_id}
                  onClick={() => handleAvatarClick(member)}
                  className="w-full text-left"
                >
                  <div className="relative flex items-center bg-slate-800 rounded-2xl p-4 border border-slate-700 hover:bg-slate-750 transition-colors">
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
                        {member.streak || 0} streak
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
                </button>
              ))
            )}
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

      {/* Profile Quick View Sheet */}
      <ProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        user={selectedProfile}
        onMentionInChat={handleMentionInChat}
        currentFacet={selectedFacet}
      />
    </div>
  );
}