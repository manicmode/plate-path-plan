import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star, 
  Flame, 
  Send, 
  MessageCircle,
  ChevronUp,
  ChevronDown
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
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", score: 95, streak: 12, gold: 3, silver: 2, bronze: 1, rank: 1, isCurrentUser: false },
  { id: 2, nickname: "Maya 🌟", avatar: "🌟", score: 92, streak: 8, gold: 2, silver: 3, bronze: 2, rank: 2, isCurrentUser: true },
  { id: 3, nickname: "Sam 🔥", avatar: "🔥", score: 88, streak: 5, gold: 1, silver: 2, bronze: 4, rank: 3, isCurrentUser: false },
  { id: 4, nickname: "Jordan 🚀", avatar: "🚀", score: 85, streak: 15, gold: 0, silver: 1, bronze: 3, rank: 4, isCurrentUser: false },
  { id: 5, nickname: "Casey 🌈", avatar: "🌈", score: 82, streak: 3, gold: 1, silver: 0, bronze: 2, rank: 5, isCurrentUser: false },
];

const mockPodiumWinners = [
  { id: 1, nickname: "Alex 🦄", avatar: "🦄", score: 2850, position: 1 },
  { id: 2, nickname: "Maya 🌟", avatar: "🌟", score: 2720, position: 2 },
  { id: 3, nickname: "Sam 🔥", avatar: "🔥", score: 2650, position: 3 },
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
          <div className="flex justify-center space-x-6">
            {[
              { id: 'ranking', label: 'Ranking', icon: Trophy },
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'winners', label: 'Winners', icon: Crown }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeSection === id ? "default" : "ghost"}
                onClick={() => scrollToSection(id)}
                className="flex items-center gap-2 transition-all duration-300"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
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
      </div>
    </div>
  );
}