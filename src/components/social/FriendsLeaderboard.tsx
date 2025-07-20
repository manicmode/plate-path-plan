import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Zap, 
  TrendingUp, 
  Calendar,
  Crown,
  Medal,
  Award
} from 'lucide-react';

interface FriendsLeaderboardProps {
  friends: any[];
}

const LeaderboardCard = ({ friend, rank, category }: { friend: any; rank: number; category: string }) => {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <div className="w-5 h-5 text-center text-sm font-bold">{position}</div>;
    }
  };

  const getCategoryValue = (friend: any, category: string) => {
    const chatCount = friend.metadata?.chatCount || 0;
    switch (category) {
      case 'streaks': return `${chatCount + Math.floor(Math.random() * 20)} days`;
      case 'consistency': return `${Math.round(friend.relevanceScore || 50)}%`;
      case 'improvement': return `+${Math.floor(Math.random() * 30)}%`;
      default: return `${chatCount}`;
    }
  };

  return (
    <Card className={`transition-all duration-300 ${rank <= 3 ? 'border-primary/20 shadow-md' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8">
            {getRankIcon(rank)}
          </div>
          
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {friend.name?.charAt(0) || '👤'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{friend.name}</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getCategoryValue(friend, category)}
              </Badge>
              {rank <= 3 && (
                <Badge variant="secondary" className="text-xs">
                  Top Performer
                </Badge>
              )}
            </div>
          </div>
          
          {friend.metadata?.activityStatus === 'recently_active' && (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {rank === 1 && (
          <div className="mt-3 p-2 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
            <div className="text-xs text-yellow-800 font-medium">
              🎉 Leading this week! Keep up the amazing work!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const FriendsLeaderboard = ({ friends }: FriendsLeaderboardProps) => {
  const [selectedCategory, setSelectedCategory] = useState('streaks');

  const sortFriends = (category: string) => {
    return [...friends].sort((a, b) => {
      switch (category) {
        case 'streaks':
          return (b.metadata?.chatCount || 0) - (a.metadata?.chatCount || 0);
        case 'consistency':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case 'improvement':
          return (b.metadata?.sharedChallenges || 0) - (a.metadata?.sharedChallenges || 0);
        default:
          return 0;
      }
    });
  };

  const sortedFriends = sortFriends(selectedCategory);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Trophy className="h-5 w-5" />
          Friends Leaderboard
        </h2>
        <p className="text-sm text-muted-foreground">
          See how you and your friends are performing this week
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="streaks" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Goal Streaks
          </TabsTrigger>
          <TabsTrigger value="consistency" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Most Consistent
          </TabsTrigger>
          <TabsTrigger value="improvement" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Most Improved
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-3">
          {/* Top 3 Podium */}
          {sortedFriends.length >= 3 && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {/* 2nd Place */}
              <div className="order-1">
                <Card className="border-gray-400/20 bg-gradient-to-b from-gray-50 to-white">
                  <CardContent className="p-3 text-center">
                    <Medal className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <Avatar className="h-12 w-12 mx-auto mb-2">
                      <AvatarFallback>
                        {sortedFriends[1]?.name?.charAt(0) || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium text-sm truncate">
                      {sortedFriends[1]?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      2nd Place
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 1st Place */}
              <div className="order-2">
                <Card className="border-yellow-400/20 bg-gradient-to-b from-yellow-50 to-white transform scale-105">
                  <CardContent className="p-3 text-center">
                    <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-yellow-400">
                      <AvatarFallback>
                        {sortedFriends[0]?.name?.charAt(0) || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-bold text-sm truncate">
                      {sortedFriends[0]?.name}
                    </div>
                    <div className="text-xs text-yellow-600 font-medium">
                      👑 Champion
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3rd Place */}
              <div className="order-3">
                <Card className="border-amber-400/20 bg-gradient-to-b from-amber-50 to-white">
                  <CardContent className="p-3 text-center">
                    <Award className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <Avatar className="h-12 w-12 mx-auto mb-2">
                      <AvatarFallback>
                        {sortedFriends[2]?.name?.charAt(0) || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium text-sm truncate">
                      {sortedFriends[2]?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      3rd Place
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Full Rankings */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground mb-3">
              Complete Rankings
            </h3>
            {sortedFriends.map((friend, index) => (
              <LeaderboardCard
                key={friend.id}
                friend={friend}
                rank={index + 1}
                category={selectedCategory}
              />
            ))}
          </div>

          {sortedFriends.length === 0 && (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No rankings yet</h3>
              <p className="text-sm text-muted-foreground">
                Add friends to see the leaderboard
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Motivational Message */}
      {sortedFriends.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <div className="text-sm">
              <span className="font-medium">💪 Keep it up!</span>
              <br />
              You're part of an amazing community pushing each other to be better every day.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};