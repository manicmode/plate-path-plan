import React, { useState, useEffect } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star, 
  Flame, 
  Send, 
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Users,
  Target,
  Gift,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Filter,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { ProgressAvatar } from '@/components/analytics/ui/ProgressAvatar';
import { FriendsArena } from '@/components/analytics/FriendsArena';
import { PodiumOfTheMonth } from '@/components/analytics/PodiumOfTheMonth';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';
import { ChallengeCard } from '@/components/analytics/ChallengeCard';
import { MicroChallengeCreationModal } from '@/components/analytics/MicroChallengeCreationModal';
import { MicroChallengeCard } from '@/components/analytics/MicroChallengeCard';
import { MysteryBox } from '@/components/analytics/MysteryBox';
import { useChallenge } from '@/contexts/ChallengeContext';
import { cn } from '@/lib/utils';

// Types
interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  reactions?: string[];
  isBot?: boolean;
}

// Mock data for demonstration
const mockLeaderboard = [
  { 
    id: 1, 
    nickname: "Alex 🦄", 
    avatar: "🦄", 
    score: 95, 
    streak: 12, 
    gold: 3, 
    silver: 2, 
    bronze: 1, 
    rank: 1, 
    isCurrentUser: false, 
    consistency: 95, 
    improvement: 12,
    mealsLoggedThisWeek: 6,
    totalMealsThisWeek: 7,
    weeklyProgress: 86,
    dailyStreak: 12,
    weeklyStreak: 2
  },
  { 
    id: 2, 
    nickname: "Maya 🌟", 
    avatar: "🌟", 
    score: 92, 
    streak: 8, 
    gold: 2, 
    silver: 3, 
    bronze: 2, 
    rank: 2, 
    isCurrentUser: true, 
    consistency: 88, 
    improvement: 8,
    mealsLoggedThisWeek: 5,
    totalMealsThisWeek: 7,
    weeklyProgress: 71,
    dailyStreak: 8,
    weeklyStreak: 1
  },
  { 
    id: 3, 
    nickname: "Sam 🔥", 
    avatar: "🔥", 
    score: 88, 
    streak: 5, 
    gold: 1, 
    silver: 2, 
    bronze: 4, 
    rank: 3, 
    isCurrentUser: false, 
    consistency: 76, 
    improvement: -3,
    mealsLoggedThisWeek: 4,
    totalMealsThisWeek: 7,
    weeklyProgress: 57,
    dailyStreak: 5,
    weeklyStreak: 0
  },
  { 
    id: 4, 
    nickname: "Jordan 🚀", 
    avatar: "🚀", 
    score: 85, 
    streak: 15, 
    gold: 0, 
    silver: 1, 
    bronze: 3, 
    rank: 4, 
    isCurrentUser: false, 
    consistency: 92, 
    improvement: 15,
    mealsLoggedThisWeek: 7,
    totalMealsThisWeek: 7,
    weeklyProgress: 100,
    dailyStreak: 15,
    weeklyStreak: 3
  },
  { 
    id: 5, 
    nickname: "Casey 🌈", 
    avatar: "🌈", 
    score: 82, 
    streak: 3, 
    gold: 1, 
    silver: 0, 
    bronze: 2, 
    rank: 5, 
    isCurrentUser: false, 
    consistency: 65, 
    improvement: -5,
    mealsLoggedThisWeek: 3,
    totalMealsThisWeek: 7,
    weeklyProgress: 43,
    dailyStreak: 3,
    weeklyStreak: 0
  },
];

const mockPodiumWinners = [
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", score: 2850, position: 1 as const, weeklyProgress: 98, dailyStreak: 28 },
  { id: 2, nickname: "Maya 🌟", avatar: "🌟", score: 2720, position: 2 as const, weeklyProgress: 92, dailyStreak: 25 },
  { id: 3, nickname: "Sam 🔥", avatar: "🔥", score: 2650, position: 3 as const, weeklyProgress: 87, dailyStreak: 22 },
];

const mockHallOfFame = [
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", month: "December", year: "2024", score: 2850, quote: "Beast Mode Activated 💪", achievement: "🏆 December 2024 Champion", trophy: "gold" as const },
  { id: 2, nickname: "Luna 🌙", avatar: "🌙", month: "November", year: "2024", score: 2720, quote: "Consistency is Key 🗝️", achievement: "🏆 November 2024 Champion", trophy: "gold" as const },
  { id: 3, nickname: "Phoenix 🔥", avatar: "🔥", month: "October", year: "2024", score: 2650, quote: "Rise from the Ashes 🔥", achievement: "🏆 October 2024 Champion", trophy: "gold" as const },
  { id: 4, nickname: "Storm ⚡", avatar: "⚡", month: "September", year: "2024", score: 2580, quote: "Electrifying Performance ⚡", achievement: "🏆 September 2024 Champion", trophy: "gold" as const },
  { id: 5, nickname: "Zen Master 🧘", avatar: "🧘", month: "August", year: "2024", score: 2320, quote: "Mind over matter, always", achievement: "🥈 Most Consistent in August", trophy: "silver" as const },
  { id: 6, nickname: "Iron Will 💪", avatar: "💪", month: "July", year: "2024", score: 2145, quote: "Every rep counts!", achievement: "🥉 Most Improved in July", trophy: "bronze" as const },
  { id: 7, nickname: "Green Goddess 🌱", avatar: "🌱", month: "June", year: "2024", score: 2890, quote: "Plants are power!", achievement: "🏆 June 2024 Champion", trophy: "gold" as const },
  { id: 8, nickname: "Sunshine ☀️", avatar: "☀️", month: "May", year: "2024", score: 2076, quote: "Bright days ahead!", achievement: "⭐ Positivity Award May", trophy: "special" as const },
  { id: 9, nickname: "Ocean Wave 🌊", avatar: "🌊", month: "April", year: "2024", score: 2234, quote: "Flow like water", achievement: "🥈 Hydration Hero April", trophy: "silver" as const },
  { id: 10, nickname: "Mountain Peak ⛰️", avatar: "⛰️", month: "March", year: "2024", score: 2567, quote: "Reach new heights!", achievement: "🏆 March 2024 Champion", trophy: "gold" as const },
];

const mockFriends = [
  { id: 1, nickname: "Best Friend 💕", avatar: "💕", rank: 2, trend: "up" as const, score: 89, streak: 15, weeklyProgress: 92, isOnline: true, lastSeen: "2 min ago" },
  { id: 2, nickname: "Workout Buddy 💪", avatar: "💪", rank: 7, trend: "down" as const, score: 78, streak: 8, weeklyProgress: 67, isOnline: false, lastSeen: "1 hour ago" },
  { id: 3, nickname: "Health Guru 🥗", avatar: "🥗", rank: 4, trend: "up" as const, score: 85, streak: 12, weeklyProgress: 85, isOnline: true, lastSeen: "just now" },
  { id: 4, nickname: "Running Mate 🏃", avatar: "🏃", rank: 6, trend: "up" as const, score: 82, streak: 5, weeklyProgress: 71, isOnline: false, lastSeen: "3 hours ago" },
  { id: 5, nickname: "Yoga Queen 🧘‍♀️", avatar: "🧘‍♀️", rank: 3, trend: "up" as const, score: 87, streak: 20, weeklyProgress: 95, isOnline: true, lastSeen: "5 min ago" },
  { id: 6, nickname: "Meal Prep King 👨‍🍳", avatar: "👨‍🍳", rank: 8, trend: "down" as const, score: 76, streak: 3, weeklyProgress: 48, isOnline: false, lastSeen: "2 days ago" },
];

const mockChatMessages: ChatMessage[] = [
  { id: 1, user: "Alex 🦄", message: "Great job everyone! 💪", time: "2:15 PM", reactions: ["🔥", "👏"] },
  { id: 2, user: "Bot", message: "@Maya wins the 🥑 Consistency Award!", time: "2:10 PM", isBot: true, reactions: [] },
  { id: 3, user: "Sam 🔥", message: "Who wants to start a 7-day streak challenge?", time: "1:45 PM", reactions: ["😆", "🚀"] },
];

export default function GameAndChallengePage() {
  return (
    <RewardsProvider>
      <ChallengeProvider>
        <GameAndChallengeContent />
      </ChallengeProvider>
    </RewardsProvider>
  );
}

function GameAndChallengeContent() {
  const { challenges, microChallenges, nudgeFriend } = useChallenge();
  const [activeSection, setActiveSection] = useState('ranking');
  const [chatMessage, setChatMessage] = useState('');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [messages, setMessages] = useState(mockChatMessages);
  const [sortBy, setSortBy] = useState('score');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showMicroChallengeModal, setShowMicroChallengeModal] = useState(false);
  const [showRewardBox, setShowRewardBox] = useState(false);
  
  // Use the scroll-to-top hook
  useScrollToTop();

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: "Maya 🌟",
        message: chatMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: []
      };
      setMessages([...messages, newMessage]);
      setChatMessage('');
    }
  };

  const addReaction = (messageId: number, emoji: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: [...(msg.reactions || []), emoji] }
        : msg
    ));
  };

  const quickEmojis = ['😆', '🔥', '👏', '🥦', '🍩', '💪', '🚀', '⭐'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative">
      {/* Mystery Boxes */}
      <MysteryBox position="top-right" />
      <MysteryBox position="bottom-left" />
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-4 flex-wrap">
            {[
              { id: 'ranking', label: 'Ranking', icon: Trophy },
              { id: 'challenges', label: 'Challenges', icon: Target },
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'winners', label: 'Winners', icon: Crown },
              { id: 'hall-of-fame', label: 'Hall of Fame', icon: Star }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeSection === id ? "default" : "ghost"}
                onClick={() => scrollToSection(id)}
                className="flex items-center gap-2 transition-all duration-300"
                size="sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
          
          {/* Sort Controls */}
          {activeSection === 'ranking' && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Sort by:</span>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="consistency">Consistency</SelectItem>
                  <SelectItem value="improvement">Most Improved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        
        {/* Ranking Arena Section */}
        <section id="ranking" className="animate-fade-in">
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  Live Rankings Arena
                  <Trophy className="h-8 w-8 text-yellow-500" />
                </CardTitle>
                
                {/* Create Challenge Button */}
                <Button 
                  onClick={() => setShowChallengeModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Create Challenge
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {mockLeaderboard.map((user, index) => (
                  <div
                    key={user.id}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-500 hover:scale-[1.02]",
                      user.isCurrentUser 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20 ring-2 ring-primary/30" 
                        : "border-muted bg-muted/30 hover:border-primary/40"
                    )}
                  >
                    {user.isCurrentUser && (
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold">
                        YOU
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-muted-foreground w-8">
                          #{user.rank}
                        </div>
                        
                        {/* Enhanced Progress Avatar */}
                        <ProgressAvatar 
                          avatar={user.avatar}
                          nickname={user.nickname}
                          weeklyProgress={user.weeklyProgress}
                          dailyStreak={user.dailyStreak}
                          weeklyStreak={user.weeklyStreak}
                          size="md"
                        />
                        
                        {/* Additional Progress Stats */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-700 dark:text-green-400 font-medium">
                              {user.mealsLoggedThisWeek}/{user.totalMealsThisWeek}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Score: {user.score}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Trophies */}
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                            🥇 {user.gold}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400">
                            🥈 {user.silver}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                            🥉 {user.bronze}
                          </Badge>
                        </div>
                        
                        {/* Improvement Indicator */}
                        <div className="flex items-center gap-2">
                          {user.improvement > 0 ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-sm font-medium">+{user.improvement}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-sm font-medium">{user.improvement}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Active Challenges Section */}
        <section id="challenges" className="animate-fade-in">
          <Card className="overflow-hidden border-2 border-green-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  <Target className="h-8 w-8 text-green-600" />
                  🏃‍♂️ Active Challenges
                  <Target className="h-8 w-8 text-green-600" />
                </CardTitle>
                
                <Button 
                  onClick={() => setShowChallengeModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  New Challenge
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Join ongoing challenges or create your own mini-competition!
              </p>
            </CardHeader>
            
            <CardContent className="p-6">
              {challenges.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {challenges.map((challenge) => (
                    <ChallengeCard 
                      key={challenge.id} 
                      challenge={challenge} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Active Challenges</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to create a challenge and inspire others to join!
                  </p>
                  <Button 
                    onClick={() => setShowChallengeModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Challenge
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Micro-Challenges Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                <h2 className="text-2xl font-bold">⚡ Micro-Challenges</h2>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  Quick & Fun
                </Badge>
              </div>
              
              <Button 
                onClick={() => setShowMicroChallengeModal(true)}
                size="sm"
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                Create Micro-Challenge
              </Button>
            </div>
            
            {microChallenges.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {microChallenges.map((challenge) => (
                  <MicroChallengeCard 
                    key={challenge.id} 
                    challenge={challenge}
                    onNudgeFriend={nudgeFriend}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-2 border-dashed border-yellow-300 dark:border-yellow-700">
                <CardContent className="text-center py-8">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Micro-Challenges Yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Create quick 1-7 day challenges with friends for instant motivation!
                  </p>
                  <Button 
                    onClick={() => setShowMicroChallengeModal(true)}
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Your First Micro-Challenge
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Friends in the Arena Section */}
        <section id="friends" className="animate-fade-in">
          <FriendsArena friends={mockFriends} />
        </section>

        {/* Chat Window Panel */}
        <section id="chat" className="animate-fade-in">
          <Card className="overflow-hidden border-2 border-secondary/20 shadow-xl">
            <CardHeader 
              className="bg-gradient-to-r from-secondary/10 to-primary/10 cursor-pointer"
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-secondary" />
                  Group Chat
                  <Badge variant="secondary">Live</Badge>
                </div>
                {isChatCollapsed ? <ChevronDown /> : <ChevronUp />}
              </CardTitle>
            </CardHeader>
            
            {!isChatCollapsed && (
              <CardContent className="p-0">
                <ScrollArea className="h-80 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn(
                        "p-3 rounded-lg max-w-[80%]",
                        msg.isBot 
                          ? "bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 mx-auto text-center" 
                          : "bg-muted/50"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{msg.user}</span>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <div className="text-sm">{msg.message}</div>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {msg.reactions.map((reaction, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {reaction}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1 mt-2">
                          {quickEmojis.slice(0, 4).map((emoji) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-xs hover:scale-110 transition-transform"
                              onClick={() => addReaction(msg.id, emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t bg-muted/20">
                  <div className="flex gap-2 mb-3">
                    {quickEmojis.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 hover:scale-110 transition-transform"
                        onClick={() => setChatMessage(chatMessage + emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button onClick={sendMessage} size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </section>

        {/* Podium of the Month Section */}
        <section id="winners" className="animate-fade-in">
          <PodiumOfTheMonth contenders={mockPodiumWinners} />
        </section>

        {/* Hall of Fame Section */}
        <section id="hall-of-fame" className="animate-fade-in">
          <HallOfFame champions={mockHallOfFame} />
        </section>

        {/* Challenge Creation Modal */}
        <ChallengeCreationModal
          open={showChallengeModal}
          onOpenChange={setShowChallengeModal}
          friends={mockFriends}
        />

        {/* Micro-Challenge Creation Modal */}
        <MicroChallengeCreationModal
          open={showMicroChallengeModal}
          onOpenChange={setShowMicroChallengeModal}
        />

        {/* Mystery Reward Box Button */}
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={() => setShowRewardBox(!showRewardBox)}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-2xl animate-bounce"
            size="sm"
          >
            <Gift className="h-8 w-8" />
          </Button>
          
          {showRewardBox && (
            <div className="absolute bottom-20 right-0 bg-background border rounded-lg p-4 shadow-xl animate-scale-in">
              <h4 className="font-bold mb-2">🎁 Mystery Box</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Complete daily challenges to unlock rewards!
              </p>
              <Button size="sm" className="w-full">
                Open Box
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}