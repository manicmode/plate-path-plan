import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  Star, 
  Heart, 
  Zap, 
  Target,
  Award,
  Calendar,
  Activity,
  Crown,
  Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";

interface UserStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    nickname: string;
    avatar: string;
    rank: number;
    score: number;
    streak: number;
    weeklyProgress: number;
    trend: 'up' | 'down' | 'stable';
    isOnline: boolean;
  };
}

export const UserStatsModal: React.FC<UserStatsModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(Math.floor(Math.random() * 50) + 10);

  // Mock data for the user stats
  const mockStats = {
    lifetimeBestScore: user.score + Math.floor(Math.random() * 500),
    totalChallengesCompleted: Math.floor(Math.random() * 100) + 20,
    personalBestStreak: user.streak + Math.floor(Math.random() * 10),
    favoriteChallengeCategory: "Nutrition Tracking",
    joinedDate: "March 2024",
    totalActiveHours: Math.floor(Math.random() * 200) + 50,
    achievements: Math.floor(Math.random() * 15) + 5
  };

  const trophies = [
    { id: 1, name: "Hydration Hero", icon: "💧", category: "Hydration", date: "2024-01-15", rarity: "gold" },
    { id: 2, name: "Early Bird", icon: "🌅", category: "Consistency", date: "2024-01-20", rarity: "silver" },
    { id: 3, name: "Nutrition Master", icon: "🥗", category: "Nutrition", date: "2024-02-01", rarity: "gold" },
    { id: 4, name: "Beast Mode", icon: "💪", category: "Exercise", date: "2024-02-10", rarity: "bronze" },
    { id: 5, name: "Streak Warrior", icon: "🔥", category: "Consistency", date: "2024-02-15", rarity: "gold" }
  ];

  const funTitles = [
    { title: "Dawn Warrior", description: "Logs consistently before 9 AM", icon: "🌅" },
    { title: "Hydration Champion", description: "Never misses daily water goals", icon: "💧" },
    { title: "Macro Master", description: "Perfect macro balance for 7 days", icon: "🎯" },
    { title: "Social Butterfly", description: "Active in community challenges", icon: "🦋" }
  ];

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikes(prev => prev + 1);
      
      // Confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      });
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      case 'bronze': return 'from-amber-500 to-amber-700';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  const getRankIcon = () => {
    if (user.rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (user.rank === 2) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (user.rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <Star className="h-5 w-5 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="sr-only">User Profile</DialogTitle>
          
          {/* User Header */}
          <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
            <div className="relative">
              <div className="text-4xl">{user.avatar}</div>
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{user.nickname}</h2>
                {getRankIcon()}
                <Badge variant="secondary" className="ml-auto">
                  Rank #{user.rank}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {user.score} pts
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {user.streak} day streak
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {user.weeklyProgress}% this week
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={handleLike}
                variant={isLiked ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all duration-300",
                  isLiked && "bg-red-500 hover:bg-red-600"
                )}
              >
                <Heart className={cn("h-4 w-4 mr-1", isLiked && "fill-current")} />
                {likes}
              </Button>
              
              <Button variant="outline" size="sm" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Challenge
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trophies">🏆 Trophies</TabsTrigger>
            <TabsTrigger value="stats">📊 Stats</TabsTrigger>
            <TabsTrigger value="titles">🚀 Titles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Current Score</span>
                      <span className="text-sm font-bold">{user.score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Weekly Growth</span>
                      <span className="text-sm font-bold text-green-500">+{user.weeklyProgress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Current Streak</span>
                      <span className="text-sm font-bold">{user.streak} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Member Since</span>
                      <span className="text-sm font-bold">{mockStats.joinedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Active Hours</span>
                      <span className="text-sm font-bold">{mockStats.totalActiveHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Achievements</span>
                      <span className="text-sm font-bold">{mockStats.achievements}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trophies" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {trophies.map((trophy) => (
                <Card key={trophy.id} className="relative overflow-hidden group hover:scale-105 transition-transform duration-200">
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-10",
                    getRarityColor(trophy.rarity)
                  )} />
                  <CardContent className="p-3 text-center relative">
                    <div className="text-2xl mb-2">{trophy.icon}</div>
                    <h3 className="font-semibold text-sm">{trophy.name}</h3>
                    <p className="text-xs text-muted-foreground mb-1">{trophy.category}</p>
                    <p className="text-xs text-muted-foreground">{trophy.date}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {trophy.rarity}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Lifetime Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Best Score</span>
                    <span className="font-bold">{mockStats.lifetimeBestScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Longest Streak</span>
                    <span className="font-bold">{mockStats.personalBestStreak} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Challenges Won</span>
                    <span className="font-bold">{mockStats.totalChallengesCompleted}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Favorite Category</span>
                    <p className="font-bold">{mockStats.favoriteChallengeCategory}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Most Active Time</span>
                    <p className="font-bold">Morning (6-9 AM)</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="titles" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {funTitles.map((title, index) => (
                <Card key={index} className="relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-2xl">{title.icon}</div>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      {title.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{title.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};