import React, { useState, useEffect } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
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
  Sparkles
} from 'lucide-react';
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
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", score: 95, streak: 12, gold: 3, silver: 2, bronze: 1, rank: 1, isCurrentUser: false, consistency: 95, improvement: 12 },
  { id: 2, nickname: "Maya 🌟", avatar: "🌟", score: 92, streak: 8, gold: 2, silver: 3, bronze: 2, rank: 2, isCurrentUser: true, consistency: 88, improvement: 8 },
  { id: 3, nickname: "Sam 🔥", avatar: "🔥", score: 88, streak: 5, gold: 1, silver: 2, bronze: 4, rank: 3, isCurrentUser: false, consistency: 76, improvement: -3 },
  { id: 4, nickname: "Jordan 🚀", avatar: "🚀", score: 85, streak: 15, gold: 0, silver: 1, bronze: 3, rank: 4, isCurrentUser: false, consistency: 92, improvement: 15 },
  { id: 5, nickname: "Casey 🌈", avatar: "🌈", score: 82, streak: 3, gold: 1, silver: 0, bronze: 2, rank: 5, isCurrentUser: false, consistency: 65, improvement: -5 },
];

const mockPodiumWinners = [
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", score: 2850, position: 1 },
  { id: 2, nickname: "Maya 🌟", avatar: "🌟", score: 2720, position: 2 },
  { id: 3, nickname: "Sam 🔥", avatar: "🔥", score: 2650, position: 3 },
];

const mockHallOfFame = [
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", month: "December", year: "2024", score: 2850, quote: "Beast Mode Activated 💪" },
  { id: 2, nickname: "Luna 🌙", avatar: "🌙", month: "November", year: "2024", score: 2720, quote: "Consistency is Key 🗝️" },
  { id: 3, nickname: "Phoenix 🔥", avatar: "🔥", month: "October", year: "2024", score: 2650, quote: "Rise from the Ashes 🔥" },
  { id: 4, nickname: "Storm ⚡", avatar: "⚡", month: "September", year: "2024", score: 2580, quote: "Electrifying Performance ⚡" },
];

const mockFriends = [
  { id: 1, nickname: "Best Friend 💕", avatar: "💕", rank: 2, trend: "up", score: 89 },
  { id: 2, nickname: "Workout Buddy 💪", avatar: "💪", rank: 7, trend: "down", score: 78 },
  { id: 3, nickname: "Health Guru 🥗", avatar: "🥗", rank: 4, trend: "up", score: 85 },
];

const mockActiveChallenges = [
  { id: 1, name: "7-Day Veggie Challenge", creator: "Sam 🔥", participants: 5, timeLeft: "3 days", progress: 60 },
  { id: 2, name: "Water Warrior Week", creator: "Maya 🌟", participants: 8, timeLeft: "2 days", progress: 85 },
];

const mockChatMessages: ChatMessage[] = [
  { id: 1, user: "Alex 🦄", message: "Great job everyone! 💪", time: "2:15 PM", reactions: ["🔥", "👏"] },
  { id: 2, user: "Bot", message: "@Maya wins the 🥑 Consistency Award!", time: "2:10 PM", isBot: true, reactions: [] },
  { id: 3, user: "Sam 🔥", message: "Who wants to start a 7-day streak challenge?", time: "1:45 PM", reactions: ["😆", "🚀"] },
];

export default function GameAndChallengePage() {
  const [activeSection, setActiveSection] = useState('ranking');
  const [chatMessage, setChatMessage] = useState('');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [messages, setMessages] = useState(mockChatMessages);
  const [sortBy, setSortBy] = useState('score');
  
  // Use the scroll-to-top hook
  useScrollToTop();
  const [showRewardBox, setShowRewardBox] = useState(false);
  const [challengeName, setChallengeName] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7');

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-4 flex-wrap">
            {[
              { id: 'ranking', label: 'Ranking', icon: Trophy },
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'winners', label: 'Winners', icon: Crown },
              { id: 'hall-of-fame', label: 'Hall of Fame', icon: Star },
              { id: 'challenges', label: 'Challenges', icon: Target }
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
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                Live Rankings Arena
                <Trophy className="h-8 w-8 text-yellow-500" />
              </CardTitle>
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
                        <Avatar className="h-12 w-12 text-2xl">
                          <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                            {user.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{user.nickname}</div>
                          <div className="text-sm text-muted-foreground">
                            Streak: {user.streak} <Flame className="inline h-4 w-4 text-orange-500" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Score Ring */}
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-muted flex items-center justify-center relative">
                            <div 
                              className="absolute inset-0 rounded-full border-4 border-primary transition-all duration-1000"
                              style={{
                                background: `conic-gradient(hsl(var(--primary)) ${user.score * 3.6}deg, transparent 0deg)`
                              }}
                            />
                            <span className="text-sm font-bold z-10">{user.score}</span>
                          </div>
                        </div>
                        
                        {/* Trophies */}
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            🥇 {user.gold}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            🥈 {user.silver}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            🥉 {user.bronze}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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

        {/* Trophy Podium Section */}
        <section id="winners" className="animate-fade-in">
          <Card className="overflow-hidden border-2 border-yellow-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-yellow-100 to-orange-100 text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                <Crown className="h-8 w-8 text-yellow-500" />
                Last Month's Champions
                <Crown className="h-8 w-8 text-yellow-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex justify-center items-end gap-8 max-w-2xl mx-auto">
                {/* 2nd Place */}
                <div className="text-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
                  <div className="relative">
                    <Avatar className="h-20 w-20 mx-auto mb-4 text-4xl border-4 border-gray-300">
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-gray-100 to-gray-200">
                        {mockPodiumWinners[1].avatar}
                      </AvatarFallback>
                    </Avatar>
                    <Medal className="h-8 w-8 text-gray-400 absolute -top-2 -right-2" />
                  </div>
                  <div className="bg-gradient-to-t from-gray-300 to-gray-200 h-24 w-24 mx-auto rounded-t-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-bold">{mockPodiumWinners[1].nickname}</div>
                    <div className="text-sm text-muted-foreground">{mockPodiumWinners[1].score} pts</div>
                    <Button variant="outline" size="sm" className="mt-2">
                      🎉 Cheer
                    </Button>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="text-center animate-scale-in relative">
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-2xl animate-bounce">
                    ✨🎉✨
                  </div>
                  <div className="relative">
                    <Avatar className="h-24 w-24 mx-auto mb-4 text-5xl border-4 border-yellow-400 shadow-lg">
                      <AvatarFallback className="text-5xl bg-gradient-to-br from-yellow-200 to-yellow-300">
                        {mockPodiumWinners[0].avatar}
                      </AvatarFallback>
                    </Avatar>
                    <Crown className="h-10 w-10 text-yellow-500 absolute -top-3 left-1/2 transform -translate-x-1/2" />
                  </div>
                  <div className="bg-gradient-to-t from-yellow-500 to-yellow-400 h-32 w-28 mx-auto rounded-t-lg flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">1</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-lg">{mockPodiumWinners[0].nickname}</div>
                    <div className="text-sm text-muted-foreground">{mockPodiumWinners[0].score} pts</div>
                    <Button variant="default" size="sm" className="mt-2 bg-yellow-500 hover:bg-yellow-600">
                      🏆 Celebrate
                    </Button>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="text-center animate-scale-in" style={{ animationDelay: '0.4s' }}>
                  <div className="relative">
                    <Avatar className="h-18 w-18 mx-auto mb-4 text-3xl border-4 border-orange-300">
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-orange-100 to-orange-200">
                        {mockPodiumWinners[2].avatar}
                      </AvatarFallback>
                    </Avatar>
                    <Star className="h-7 w-7 text-orange-400 absolute -top-1 -right-1" />
                  </div>
                  <div className="bg-gradient-to-t from-orange-400 to-orange-300 h-20 w-20 mx-auto rounded-t-lg flex items-center justify-center">
                    <span className="text-xl font-bold text-white">3</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-bold">{mockPodiumWinners[2].nickname}</div>
                    <div className="text-sm text-muted-foreground">{mockPodiumWinners[2].score} pts</div>
                    <Button variant="outline" size="sm" className="mt-2">
                      👏 Applaud
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Hall of Fame Wall */}
        <section id="hall-of-fame" className="animate-fade-in">
          <Card className="overflow-hidden border-2 border-purple-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100 text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                <Star className="h-8 w-8 text-purple-500" />
                🏛️ Hall of Fame Wall
                <Star className="h-8 w-8 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="w-full">
                <div className="flex gap-6 pb-4">
                  {mockHallOfFame.map((champion, index) => (
                    <div
                      key={champion.id}
                      className="min-w-[280px] p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 animate-scale-in hover:scale-105 transition-transform"
                      style={{ animationDelay: `${index * 0.2}s` }}
                    >
                      <div className="text-center">
                        <Avatar className="h-16 w-16 mx-auto mb-4 text-3xl border-4 border-purple-300">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-200 to-blue-200">
                            {champion.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-bold text-lg">{champion.nickname}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {champion.month} {champion.year}
                        </div>
                        <Badge variant="secondary" className="mb-3">
                          👑 Champion - {champion.score} pts
                        </Badge>
                        <div className="text-sm font-medium text-purple-700 bg-purple-100 p-2 rounded-lg">
                          "{champion.quote}"
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* Friends in the Arena & Micro-Challenges Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Friends in the Arena */}
          <Card className="border-2 border-green-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-100 to-teal-100">
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-green-500" />
                🧑‍🤝‍🧑 Your Friends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {mockFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 text-lg">
                        <AvatarFallback className="text-lg bg-gradient-to-br from-green-200 to-teal-200">
                          {friend.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{friend.nickname}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          Rank #{friend.rank} • {friend.score} pts
                          {friend.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      🎯 Challenge
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Micro-Challenges Launcher */}
          <Card className="border-2 border-orange-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-orange-500" />
                  🎯 Mini Challenges
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border z-50">
                    <DialogHeader>
                      <DialogTitle>Create Mini Challenge</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Challenge Name</label>
                        <Input
                          placeholder="e.g., Log All Meals for 3 Days"
                          value={challengeName}
                          onChange={(e) => setChallengeName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          placeholder="Describe your challenge..."
                          value={challengeDescription}
                          onChange={(e) => setChallengeDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Duration (days)</label>
                        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="7">1 Week</SelectItem>
                            <SelectItem value="14">2 Weeks</SelectItem>
                            <SelectItem value="30">1 Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full">
                        🚀 Launch Challenge
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {mockActiveChallenges.map((challenge) => (
                  <div key={challenge.id} className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">{challenge.name}</div>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {challenge.timeLeft}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      by {challenge.creator} • {challenge.participants} participants
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${challenge.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-orange-600 mt-1 font-medium">
                      {challenge.progress}% complete
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mystery Reward Boxes */}
        {showRewardBox && (
          <div className="fixed bottom-20 right-8 z-50 animate-bounce">
            <div
              className="relative cursor-pointer transform hover:scale-110 transition-transform"
              onClick={() => {
                setShowRewardBox(false);
                // Add reward logic here
                alert('🎁 You earned an XP Boost! +50 XP');
              }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-lg flex items-center justify-center animate-pulse">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-6 w-6 text-yellow-400 animate-spin" />
              </div>
            </div>
          </div>
        )}

        {/* Challenges Section */}
        <section id="challenges" className="animate-fade-in">
          <Card className="overflow-hidden border-2 border-blue-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                <Target className="h-8 w-8 text-blue-500" />
                Active Challenges Arena
                <Target className="h-8 w-8 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockActiveChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">{challenge.name}</h3>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {challenge.timeLeft}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Created by {challenge.creator} • {challenge.participants} participants
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{challenge.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${challenge.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        👀 View Details
                      </Button>
                      <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600">
                        🎯 Join Challenge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Mystery Reward Box Trigger */}
      <div className="fixed bottom-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRewardBox(true)}
          className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
        >
          🎁 Mystery Box
        </Button>
      </div>
    </div>
  );
}