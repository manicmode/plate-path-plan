import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  Lightbulb, 
  MessageCircle, 
  Crown, 
  Trophy, 
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { FriendProfileView } from './FriendProfileView';
import { FriendsLeaderboard } from './FriendsLeaderboard';
import { GroupFeed } from './GroupFeed';
import { useFriendTagging } from '@/hooks/useFriendTagging';
import { PrivateChallengeCreationModal } from '@/components/analytics/PrivateChallengeCreationModal';
import { FriendSearch } from './FriendSearch';
import { PendingRequests } from './PendingRequests';
import { SuggestedFriends } from './SuggestedFriends';
import { InviteFriends } from './InviteFriends';
import { cn } from '@/lib/utils';

interface FriendCardProps {
  friend: any;
  onClick: () => void;
}

const FriendCard = ({ friend, onClick }: FriendCardProps) => {
  const progressPercentage = Math.round((friend.metadata?.chatCount || 0) * 10 + Math.random() * 30);
  const lastActiveText = friend.metadata?.lastInteraction 
    ? new Date(friend.metadata.lastInteraction).toLocaleDateString()
    : 'Recently';

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {friend.name?.charAt(0) || '👤'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 text-sm">
              {friend.metadata?.activityStatus === 'recently_active' ? '😊' : 
               friend.metadata?.activityStatus === 'active' ? '💪' : 
               friend.metadata?.activityStatus === 'somewhat_active' ? '🌟' : '😴'}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{friend.name}</h3>
              {friend.metadata?.isFollowing && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Following
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                💪 Muscle Gain
              </Badge>
              <span className="text-xs text-muted-foreground">
                Active {lastActiveText}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Daily Goals</span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary/80 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const MyFriendsTab = () => {
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { friends, isLoading } = useFriendTagging(true);

  if (selectedFriend) {
    return (
      <FriendProfileView 
        friend={selectedFriend} 
        onBack={() => setSelectedFriend(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Users className="h-6 w-6" />
          My Friends
        </h1>
        <p className="text-muted-foreground">
          Connect, motivate, and grow together on your wellness journey
        </p>
      </div>

      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Group Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="h-20">
              <CardContent className="p-4 text-center h-full flex flex-col justify-center">
                <div className="text-2xl font-bold text-primary">{friends.length}</div>
                <div className="text-sm text-muted-foreground">Total Friends</div>
              </CardContent>
            </Card>
            <Card className="h-20">
              <CardContent className="p-4 text-center h-full flex flex-col justify-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {friends.filter(f => (f as any).metadata?.activityStatus === 'recently_active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active Today</div>
              </CardContent>
            </Card>
            <Card className="h-20">
              <CardContent className="p-4 text-center h-full flex flex-col justify-center">
                <div className="text-2xl font-bold text-blue-600">
                  {friends.filter(f => (f as any).metadata?.sharedChallenges > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">In Challenges</div>
              </CardContent>
            </Card>
          </div>

          {/* Friends List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading friends...</p>
                </div>
               ) : friends.length === 0 ? (
                <div className="text-center py-8 space-y-6">
                  <div>
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No friends yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect with others to see them here
                    </p>
                  </div>
                  
                  {/* Motivational section moved here */}
                  <div className="space-y-6 pt-4 border-t border-border/50">
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                      >
                        <Users className="w-5 h-5" />
                        Create New Challenge
                      </Button>
                    </div>
                    
                     <div className="text-center space-y-2 pt-4">
                       <div className="text-lg font-semibold text-foreground">
                         Motivate and grow together on your wellness journey
                       </div>
                       <p className="text-sm text-muted-foreground">
                         Create challenges with your friends to stay motivated and achieve your goals together
                       </p>
                     </div>
                     
                     {/* Friend Search */}
                     <FriendSearch />
                     
                     {/* Pending Requests */}
                     <PendingRequests />
                     
                     {/* Suggested Friends */}
                     <SuggestedFriends />
                     
                     {/* Invite Friends */}
                     <InviteFriends />
                  </div>
                </div>
              ) : (
                friends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onClick={() => setSelectedFriend(friend)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

        </TabsContent>

        <TabsContent value="leaderboard">
          <FriendsLeaderboard friends={friends} />
        </TabsContent>

        <TabsContent value="feed">
          <GroupFeed friends={friends} />
        </TabsContent>
      </Tabs>

      {/* Challenge Creation Modal */}
      <PrivateChallengeCreationModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};