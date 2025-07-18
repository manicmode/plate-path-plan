
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  Sparkles,
  Swords
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
  const [challengeSent, setChallengeSent] = useState(false);

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
    { title: "Dawn Warrior", description: "Logs consistently before 9 AM", icon: "🌅", fact: "🌅 Most active before sunrise!" },
    { title: "Hydration Champion", description: "Never misses daily water goals", icon: "💧", fact: "💧 Drinks 3L+ water daily!" },
    { title: "Macro Master", description: "Perfect macro balance for 7 days", icon: "🎯", fact: "🎯 Bullseye macro accuracy!" },
    { title: "Social Butterfly", description: "Active in community challenges", icon: "🦋", fact: "🔥 Highest 24h streak among friends!" }
  ];

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikes(prev => prev + 1);
      
      // Enhanced confetti animation
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FD79A8'],
        shapes: ['square', 'circle'],
        gravity: 0.8,
        drift: 0.1
      });

      // Rising emoji effect
      setTimeout(() => {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#FF69B4', '#FFB6C1'],
          shapes: ['circle'],
          startVelocity: 15,
          gravity: 0.5
        });
      }, 200);
    }
  };

  const handleChallenge = () => {
    setChallengeSent(true);
    
    // Sword clash effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500'],
      shapes: ['square'],
      startVelocity: 25,
      gravity: 1.2
    });

    setTimeout(() => setChallengeSent(false), 2500);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'gold': return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 'silver': return 'from-gray-300 via-gray-400 to-gray-500';
      case 'bronze': return 'from-amber-600 via-amber-700 to-amber-800';
      default: return 'from-blue-400 via-blue-500 to-blue-600';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'gold': return 'shadow-lg shadow-yellow-400/50';
      case 'silver': return 'shadow-lg shadow-gray-400/50';
      case 'bronze': return 'shadow-lg shadow-amber-600/50';
      default: return 'shadow-lg shadow-blue-400/50';
    }
  };

  const getRankIcon = () => {
    if (user.rank === 1) return <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 animate-pulse" />;
    if (user.rank === 2) return <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />;
    if (user.rank === 3) return <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />;
    return <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />;
  };

  const getStreakColor = () => {
    if (user.streak >= 30) return 'from-red-500 to-orange-600';
    if (user.streak >= 14) return 'from-orange-500 to-yellow-600';
    if (user.streak >= 7) return 'from-yellow-500 to-green-600';
    return 'from-blue-500 to-purple-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 animate-in zoom-in-95 duration-300 slide-in-from-bottom-10">
        <DialogHeader className="sr-only">
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
          
        {/* Animated Gaming Header */}
        <div className={cn(
          "relative overflow-hidden p-3 sm:p-4",
          "bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20",
          "border-b-2 border-gradient-to-r from-primary/50 to-secondary/50"
        )}>
          {/* Background glow effect */}
          <div className={cn(
            "absolute inset-0 opacity-30 animate-pulse",
            `bg-gradient-to-br ${getStreakColor()}`
          )} />
          
          <div className="relative flex items-center gap-3">
            {/* Animated Avatar with Progress Ring */}
            <div className="relative">
              {/* Progress Ring */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="hsl(var(--muted))"
                    strokeWidth="6"
                    fill="none"
                    opacity="0.3"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(user.weeklyProgress / 100) * 283} 283`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Avatar in center with sparkle animation */}
                <div className="absolute inset-2 flex items-center justify-center">
                  <div className={cn(
                    "text-2xl sm:text-3xl relative",
                    "animate-pulse hover:animate-bounce transition-all duration-300"
                  )}>
                    {user.avatar}
                    {/* Sparkle particles */}
                    <div className="absolute -inset-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-ping" />
                      <Sparkles className="absolute -bottom-1 -left-1 h-2 w-2 text-blue-400 animate-ping delay-300" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Online indicator with breathing effect */}
              {user.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-ping" />
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold truncate bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {user.nickname}
                </h2>
                
                {/* Animated Rank Badge */}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full",
                  "bg-gradient-to-r from-primary/20 to-secondary/20",
                  "border border-primary/30 backdrop-blur-sm",
                  "transform hover:scale-110 transition-all duration-200"
                )}>
                  {getRankIcon()}
                  <Badge variant="secondary" className="text-xs font-bold">
                    #{user.rank}
                  </Badge>
                </div>
              </div>
              
              {/* Compact Stats Row */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="font-bold">{user.score}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-full">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="font-bold">{user.streak}d</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-full">
                  <Activity className="h-3 w-3 text-blue-500" />
                  <span className="font-bold">{user.weeklyProgress}%</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleLike}
                variant={isLiked ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all duration-300 relative overflow-hidden",
                  isLiked ? "bg-red-500 hover:bg-red-600 scale-110" : "",
                  "hover:scale-105 active:scale-95"
                )}
              >
                <Heart className={cn(
                  "h-3 w-3 mr-1 transition-all duration-300",
                  isLiked ? "fill-current animate-bounce" : ""
                )} />
                <span className="font-bold">{likes}</span>
                {isLiked && (
                  <div className="absolute inset-0 bg-red-400 animate-ping opacity-25 rounded" />
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleChallenge}
                className={cn(
                  "text-xs px-2 relative overflow-hidden",
                  "hover:bg-orange-500 hover:text-white transition-all duration-300",
                  "active:scale-95 transform"
                )}
              >
                <Swords className="h-3 w-3 mr-1" />
                {challengeSent ? "Sent! ⚔️" : "Duel"}
                {challengeSent && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse opacity-30 rounded" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-3 h-8">
              <TabsTrigger value="overview" className="text-xs">📊</TabsTrigger>
              <TabsTrigger value="trophies" className="text-xs">🏆</TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">📈</TabsTrigger>
              <TabsTrigger value="titles" className="text-xs">🚀</TabsTrigger>
            </TabsList>
          
            <TabsContent value="overview" className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Card className="p-2 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Current Score</span>
                      <span className="text-sm font-bold text-green-500">{user.score}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Weekly Growth</span>
                      <span className="text-sm font-bold text-blue-500">+{user.weeklyProgress}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Current Streak</span>
                      <div className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span className="text-sm font-bold">{user.streak}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="p-2 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Member Since</span>
                      <span className="text-sm font-bold">{mockStats.joinedDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Active Hours</span>
                      <span className="text-sm font-bold text-purple-500">{mockStats.totalActiveHours}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Achievements</span>
                      <span className="text-sm font-bold text-yellow-500">{mockStats.achievements}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="trophies" className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {trophies.map((trophy) => (
                  <Card 
                    key={trophy.id} 
                    className={cn(
                      "relative overflow-hidden group cursor-pointer p-2",
                      "hover:scale-105 transition-all duration-300",
                      "bg-gradient-to-br", getRarityColor(trophy.rarity),
                      getRarityGlow(trophy.rarity),
                      "border-2 border-white/20"
                    )}
                  >
                    <CardContent className="p-0 text-center relative">
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      
                      <div className="text-xl sm:text-2xl mb-1 group-hover:animate-bounce">
                        {trophy.icon}
                      </div>
                      <h3 className="font-semibold text-xs sm:text-sm text-white drop-shadow-md">
                        {trophy.name}
                      </h3>
                      <p className="text-xs text-white/80 mb-1">{trophy.category}</p>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                        {trophy.rarity}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-2">
              <Card className="p-2 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500 animate-pulse" />
                    Lifetime Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Best Score</span>
                    <span className="font-bold text-sm text-yellow-600">{mockStats.lifetimeBestScore}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Longest Streak</span>
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="font-bold text-sm">{mockStats.personalBestStreak} days</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Challenges Won</span>
                    <span className="font-bold text-sm text-green-600">{mockStats.totalChallengesCompleted}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-0">
                  <div>
                    <span className="text-xs text-muted-foreground">Favorite Category</span>
                    <p className="font-bold text-sm text-blue-600">{mockStats.favoriteChallengeCategory}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Most Active Time</span>
                    <p className="font-bold text-sm text-purple-600">Morning (6-9 AM)</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="titles" className="space-y-2">
              {funTitles.map((title, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    "relative overflow-hidden p-2 group cursor-pointer",
                    "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10",
                    "border border-purple-500/20 hover:border-purple-500/40",
                    "hover:scale-[1.02] transition-all duration-300"
                  )}
                >
                  <div className="absolute top-1 right-1 text-lg opacity-70 group-hover:animate-bounce">
                    {title.icon}
                  </div>
                  <CardHeader className="p-0 pb-1">
                    <CardTitle className="text-sm flex items-center gap-2 pr-6">
                      <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                      {title.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-xs text-muted-foreground mb-1">{title.description}</p>
                    <div className="text-xs font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full inline-block">
                      {title.fact}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
