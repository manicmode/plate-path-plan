import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Heart, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { FollowButton } from './FollowButton';

interface FollowStatsCardProps {
  userId?: string;
  followersCount?: number;
  followingCount?: number;
  isCurrentUser?: boolean;
}

export const FollowStatsCard = ({ 
  userId, 
  followersCount = 0, 
  followingCount = 0,
  isCurrentUser = false 
}: FollowStatsCardProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');

  // Use current user's ID if not provided
  const targetUserId = userId || user?.id;
  
  if (!targetUserId) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social Network
        </CardTitle>
        <CardDescription>
          {isCurrentUser ? 'Your followers and following' : 'Social connections'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-4">
            {/* Social Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{followersCount}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{followingCount}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
            </div>

            {/* Follow Button for other users */}
            {!isCurrentUser && targetUserId && (
              <div className="flex justify-center pt-2">
                <FollowButton 
                  userId={targetUserId}
                  showMutualIndicator={true}
                  variant="default"
                />
              </div>
            )}

            {/* Social Badges Preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Social Achievements</h4>
              <div className="flex flex-wrap gap-2">
                {followingCount >= 10 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    🎯 Social Butterfly
                  </Badge>
                )}
                {followersCount >= 10 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    🔥 Trend Starter
                  </Badge>
                )}
                {followersCount === 0 && followingCount === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    Start following friends to unlock social badges!
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {/* Recent Social Activity */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Recent Activity</h4>
              {followersCount > 0 || followingCount > 0 ? (
                <div className="space-y-2">
                  {/* Mock recent activities */}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">JS</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-sm">
                      <span className="font-medium">John</span> started following you
                    </div>
                    <Badge variant="outline" className="text-xs">2h ago</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <Heart className="h-8 w-8 p-2 bg-red-100 text-red-600 rounded-full" />
                    <div className="flex-1 text-sm">
                      You and <span className="font-medium">Sarah</span> are now mutual followers
                    </div>
                    <Badge variant="outline" className="text-xs">1d ago</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No social activity yet</p>
                  <p className="text-sm">Start following friends to see activity here!</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {isCurrentUser && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Trophy className="h-4 w-4 mr-2" />
                    Find Friends on Leaderboard
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Invite Friends to Challenge
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};