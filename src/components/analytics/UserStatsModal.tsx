
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Swords,
  Info
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

  // Confetti effect for top performers
  React.useEffect(() => {
    if (isOpen && user.rank <= 3) {
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.3 },
          colors: user.rank === 1 ? ['#FFD700', '#FFA500'] : user.rank === 2 ? ['#C0C0C0', '#A9A9A9'] : ['#CD7F32', '#D2691E'],
          shapes: ['circle'],
          startVelocity: 20,
          gravity: 0.7
        });
      }, 300);
    }
  }, [isOpen, user.rank]);

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 animate-in zoom-in-95 duration-500 slide-in-from-bottom-10 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
            
          {/* COMPACT Gaming Header - Main Character Showcase */}
          <div className={cn(
            "relative overflow-hidden p-4 sm:p-5",
            "bg-gradient-to-br from-primary/30 via-secondary/25 to-accent/30",
            "border-b-2 border-gradient-to-r from-primary/60 to-secondary/60"
          )}>
            {/* Enhanced background glow effect */}
            <div className={cn(
              "absolute inset-0 opacity-40 animate-pulse",
              `bg-gradient-to-br ${getStreakColor()}`
            )} />
            
            {/* Floating sparkles background */}
            <div className="absolute inset-0 overflow-hidden">
              <Sparkles className="absolute top-4 left-8 h-4 w-4 text-yellow-400/60 animate-ping delay-1000" />
              <Sparkles className="absolute top-12 right-12 h-3 w-3 text-blue-400/60 animate-ping delay-2000" />
              <Sparkles className="absolute bottom-8 left-16 h-2 w-2 text-purple-400/60 animate-ping delay-500" />
            </div>
            
            <div className="relative flex flex-col items-center text-center gap-3">
              {/* COMPACT Animated Avatar with Progress Ring */}
              <div className="relative">
                {/* Progress Ring */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                  <svg className="w-full h-full transform -rotate-90 animate-spin-slow" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="hsl(var(--muted))"
                      strokeWidth="4"
                      fill="none"
                      opacity="0.3"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="url(#progressGradient)"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${(user.weeklyProgress / 100) * 264} 264`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="50%" stopColor="hsl(var(--accent))" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* ENLARGED Avatar in center with enhanced sparkle animation */}
                  <div className="absolute inset-3 flex items-center justify-center">
                    <div className={cn(
                      "text-3xl sm:text-4xl relative",
                      "hover:animate-bounce transition-all duration-300 cursor-pointer"
                    )}>
                      {user.avatar}
                      {/* Enhanced sparkle particles */}
                      <div className="absolute -inset-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-yellow-400 animate-ping" />
                        <Sparkles className="absolute -bottom-2 -left-2 h-3 w-3 text-blue-400 animate-ping delay-300" />
                        <Sparkles className="absolute top-0 -left-3 h-2 w-2 text-purple-400 animate-ping delay-600" />
                        <Sparkles className="absolute -top-1 right-0 h-2 w-2 text-green-400 animate-ping delay-900" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced online indicator with breathing effect */}
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-background animate-ping" />
                )}
              </div>
              
              {/* ENLARGED User Info Section */}
              <div className="w-full">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    {user.nickname}
                  </h2>
                  
                  {/* ENHANCED Animated Rank Badge */}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full",
                    "bg-gradient-to-r from-primary/30 to-secondary/30",
                    "border-2 border-primary/40 backdrop-blur-sm",
                    "transform hover:scale-110 transition-all duration-300",
                    "shadow-lg shadow-primary/20"
                  )}>
                    {getRankIcon()}
                    <Badge variant="secondary" className="text-sm font-bold px-2 py-0.5">
                      #{user.rank}
                    </Badge>
                  </div>
                </div>
                
                {/* REORGANIZED Stats in elegant grid with tooltips */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/30 cursor-help">
                        <TrendingUp className="h-4 w-4 text-green-500 mb-1" />
                        <span className="text-xl sm:text-2xl font-bold text-green-500">{user.score}</span>
                        <span className="text-xs text-muted-foreground">📈 Score</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Current Weekly Performance Score</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center p-2 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-xl border border-orange-500/30 cursor-help">
                        <Flame className="h-4 w-4 text-orange-500 mb-1" />
                        <span className="text-xl sm:text-2xl font-bold text-orange-500">{user.streak}</span>
                        <span className="text-xs text-muted-foreground">🔥 Streak</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Consecutive Days Logging</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-xl border border-blue-500/30 cursor-help">
                        <Activity className="h-4 w-4 text-blue-500 mb-1" />
                        <span className="text-xl sm:text-2xl font-bold text-blue-500">{user.weeklyProgress}%</span>
                        <span className="text-xs text-muted-foreground">📊 Progress</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Weekly Progress Percentage</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {/* REPOSITIONED Action Bar with enhanced styling */}
              <div className="flex items-center gap-3 mt-2">
                <Button
                  onClick={handleLike}
                  variant={isLiked ? "default" : "outline"}
                  className={cn(
                    "transition-all duration-300 relative overflow-hidden px-4 py-2",
                    isLiked ? "bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/30" : "",
                    "hover:scale-105 active:scale-95 hover:shadow-lg"
                  )}
                >
                  <Heart className={cn(
                    "h-4 w-4 mr-2 transition-all duration-300",
                    isLiked ? "fill-current animate-bounce" : ""
                  )} />
                  <span className="font-bold text-sm">❤️ Cheer ({likes})</span>
                  {isLiked && (
                    <div className="absolute inset-0 bg-red-400 animate-ping opacity-25 rounded" />
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleChallenge}
                  className={cn(
                    "px-4 py-2 relative overflow-hidden",
                    "hover:bg-orange-500 hover:text-white transition-all duration-300",
                    "active:scale-95 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30"
                  )}
                >
                  <Swords className="h-4 w-4 mr-2" />
                  <span className="font-bold text-sm">{challengeSent ? "⚔️ Sent!" : "⚔️ Duel"}</span>
                  {challengeSent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse opacity-30 rounded" />
                  )}
                </Button>
              </div>
            </div>
          </div>

        <div className="p-2 sm:p-3">
          <Tabs defaultValue="overview" className="w-full">
            {/* ENLARGED Tab Navigation with glowing underlines */}
            <TabsList className="grid w-full grid-cols-4 mb-3 h-14 bg-gradient-to-r from-primary/15 to-secondary/15 border-2 border-primary/20 rounded-xl">
              <TabsTrigger 
                value="overview" 
                className="text-sm font-bold flex flex-col items-center py-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/30 data-[state=active]:to-secondary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 rounded-lg"
              >
                <span className="text-xl">📊</span>
                <span className="text-xs font-semibold">Performance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trophies" 
                className="text-sm font-bold flex flex-col items-center py-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-500/30 data-[state=active]:to-orange-500/30 data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-500/20 rounded-lg"
              >
                <span className="text-xl">🏆</span>
                <span className="text-xs font-semibold">Trophies</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="text-sm font-bold flex flex-col items-center py-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500/30 data-[state=active]:to-blue-500/30 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/20 rounded-lg"
              >
                <span className="text-xl">📈</span>
                <span className="text-xs font-semibold">Records</span>
              </TabsTrigger>
              <TabsTrigger 
                value="titles" 
                className="text-sm font-bold flex flex-col items-center py-2 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/30 data-[state=active]:to-pink-500/30 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-lg"
              >
                <span className="text-xl">🚀</span>
                <span className="text-xs font-semibold">Titles</span>
              </TabsTrigger>
            </TabsList>
          
            <TabsContent value="overview" className="space-y-2 animate-in slide-in-from-bottom-2">
              {/* COMPACT Performance & Activity */}
              <Card className="p-2 bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15 border-primary/30 shadow-lg">
                <CardHeader className="pb-1 px-0">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Performance & Activity
                    <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent flex-1 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* TRUE 2-COLUMN GRID with equal sizes and larger numbers */}
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-green-500/25 to-green-600/15 rounded-xl border border-green-500/40 cursor-help hover:scale-105 transition-transform">
                          <TrendingUp className="h-5 w-5 text-green-500 mb-1" />
                          <span className="text-3xl font-bold text-green-500">{user.score}</span>
                          <span className="text-xs text-muted-foreground font-medium">Current Score</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Your current weekly performance score</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-500/25 to-blue-600/15 rounded-xl border border-blue-500/40 cursor-help hover:scale-105 transition-transform">
                          <Activity className="h-5 w-5 text-blue-500 mb-1" />
                          <span className="text-3xl font-bold text-blue-500">+{user.weeklyProgress}%</span>
                          <span className="text-xs text-muted-foreground font-medium">Weekly Progress</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>This week's progress percentage</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-orange-500/25 to-orange-600/15 rounded-xl border border-orange-500/40 cursor-help hover:scale-105 transition-transform">
                          <Flame className="h-5 w-5 text-orange-500 mb-1" />
                          <span className="text-3xl font-bold text-orange-500">{user.streak}</span>
                          <span className="text-xs text-muted-foreground font-medium">Consecutive Days</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Daily logging streak</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-purple-500/25 to-purple-600/15 rounded-xl border border-purple-500/40 cursor-help hover:scale-105 transition-transform">
                          <Calendar className="h-5 w-5 text-purple-500 mb-1" />
                          <span className="text-lg font-bold text-purple-500">{mockStats.joinedDate}</span>
                          <span className="text-xs text-muted-foreground font-medium">Member Since</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>When you joined the community</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-indigo-500/25 to-indigo-600/15 rounded-xl border border-indigo-500/40 cursor-help hover:scale-105 transition-transform">
                          <Activity className="h-5 w-5 text-indigo-500 mb-1" />
                          <span className="text-3xl font-bold text-indigo-500">{mockStats.totalActiveHours}h</span>
                          <span className="text-xs text-muted-foreground font-medium">Total Active Time</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Total time spent in the app</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-yellow-500/25 to-yellow-600/15 rounded-xl border border-yellow-500/40 cursor-help hover:scale-105 transition-transform">
                          <Star className="h-5 w-5 text-yellow-500 mb-1" />
                          <span className="text-3xl font-bold text-yellow-500">{mockStats.achievements}</span>
                          <span className="text-xs text-muted-foreground font-medium">Achievements</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Total achievements unlocked</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trophies" className="space-y-2 animate-in slide-in-from-bottom-2">
              <div className="text-center mb-3">
                <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 bg-clip-text text-transparent">
                  🏆 Trophy Collection
                </h3>
                <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {trophies.map((trophy, index) => (
                  <Card 
                    key={trophy.id} 
                    className={cn(
                      "relative overflow-hidden group cursor-pointer p-2",
                      "hover:scale-105 transition-all duration-300",
                      "bg-gradient-to-br", getRarityColor(trophy.rarity),
                      getRarityGlow(trophy.rarity),
                      "border-2 border-white/30 shadow-xl"
                    )}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <CardContent className="p-0 text-center relative">
                      {/* Enhanced shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      
                      {/* 3D shadow effect */}
                      <div className="absolute inset-1 bg-black/10 rounded blur-sm -z-10" />
                      
                      <div className="text-2xl sm:text-3xl mb-2 group-hover:animate-bounce relative z-10">
                        {trophy.icon}
                      </div>
                      <h3 className="font-bold text-sm text-white drop-shadow-lg mb-1">
                        {trophy.name}
                      </h3>
                      <p className="text-xs text-white/90 mb-2">{trophy.category}</p>
                      <Badge variant="secondary" className="text-xs bg-white/30 text-white border-white/40 shadow-md font-semibold">
                        {trophy.rarity}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-2 animate-in slide-in-from-bottom-2">
              {/* UNIFIED Lifetime Records */}
              <Card className="p-2 bg-gradient-to-br from-yellow-500/15 to-orange-500/15 border-yellow-500/30 shadow-lg">
                <CardHeader className="p-0 pb-1">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 justify-center">
                    <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
                    Lifetime Records
                    <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent flex-1 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* TRUE 2-COLUMN GRID for Records */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-yellow-500/25 to-yellow-600/15 rounded-xl border border-yellow-500/40 cursor-help hover:scale-105 transition-transform">
                          <Trophy className="h-5 w-5 text-yellow-600 mb-1" />
                          <span className="text-3xl font-bold text-yellow-600">{mockStats.lifetimeBestScore}</span>
                          <span className="text-xs text-muted-foreground font-medium">Personal Best</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Your highest score achieved</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-orange-500/25 to-orange-600/15 rounded-xl border border-orange-500/40 cursor-help hover:scale-105 transition-transform">
                          <Flame className="h-5 w-5 text-orange-500 mb-1" />
                          <span className="text-3xl font-bold text-orange-500">{mockStats.personalBestStreak}</span>
                          <span className="text-xs text-muted-foreground font-medium">Longest Streak</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Your longest daily logging streak</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-green-500/25 to-green-600/15 rounded-xl border border-green-500/40 cursor-help hover:scale-105 transition-transform">
                          <Award className="h-5 w-5 text-green-600 mb-1" />
                          <span className="text-3xl font-bold text-green-600">{mockStats.totalChallengesCompleted}</span>
                          <span className="text-xs text-muted-foreground font-medium">Challenges Won</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Total challenges completed</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-500/25 to-blue-600/15 rounded-xl border border-blue-500/40 cursor-help hover:scale-105 transition-transform">
                          <Target className="h-5 w-5 text-blue-600 mb-1" />
                          <span className="text-lg font-bold text-blue-600">Nutrition</span>
                          <span className="text-xs text-muted-foreground font-medium">Favorite Category</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Your most active challenge category</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
              
              {/* ENHANCED Preferences */}
              <Card className="p-2 bg-gradient-to-br from-blue-500/15 to-purple-500/15 border-blue-500/30 shadow-lg">
                <CardHeader className="p-0 pb-1">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 justify-center">
                    <Target className="h-5 w-5 text-blue-500" />
                    Preferences & Habits
                    <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent flex-1 ml-2" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-500/25 to-blue-600/15 rounded-xl border border-blue-500/40 cursor-help hover:scale-105 transition-transform">
                          <Activity className="h-6 w-6 text-blue-600 mb-2" />
                          <span className="text-sm font-bold text-blue-600">🥗 Nutrition</span>
                          <span className="text-xs text-muted-foreground font-medium">Tracking Focus</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Primary tracking preference</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-purple-500/25 to-purple-600/15 rounded-xl border border-purple-500/40 cursor-help hover:scale-105 transition-transform">
                          <Calendar className="h-6 w-6 text-purple-600 mb-2" />
                          <span className="text-sm font-bold text-purple-600">🌅 6-9 AM</span>
                          <span className="text-xs text-muted-foreground font-medium">Active Hours</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Most active time of day</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="titles" className="space-y-2 animate-in slide-in-from-bottom-2">
              <div className="text-center mb-2">
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                  🚀 Special Titles & Achievements
                </h3>
                <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mt-1" />
              </div>
              {funTitles.map((title, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    "relative overflow-hidden p-3 group cursor-pointer",
                    "bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-blue-500/15",
                    "border-2 border-purple-500/30 hover:border-purple-500/50",
                    "hover:scale-[1.02] transition-all duration-300",
                    "shadow-lg hover:shadow-purple-500/20"
                  )}
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {/* Icon column on the left */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div className="text-2xl group-hover:animate-bounce group-hover:scale-110 transition-all duration-300">
                      {title.icon}
                    </div>
                  </div>
                  
                  {/* Text content column on the right */}
                  <div className="ml-12">
                    <CardHeader className="p-0 pb-1">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                        {title.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-sm text-muted-foreground mb-2">{title.description}</p>
                      <div className="inline-flex items-center gap-1 text-sm font-bold text-purple-600 bg-gradient-to-r from-purple-100/50 to-pink-100/50 dark:from-purple-900/30 dark:to-pink-900/30 px-3 py-1 rounded-full border border-purple-300/30">
                        {title.fact}
                      </div>
                    </CardContent>
                  </div>
                  
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};
