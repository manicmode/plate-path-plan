import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { useChatModal } from '@/contexts/ChatModalContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Globe
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ProgressAvatar } from '@/components/analytics/ui/ProgressAvatar';
import { FriendsArena } from '@/components/analytics/FriendsArena';
import { MonthlyTrophyPodium } from '@/components/analytics/MonthlyTrophyPodium';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';
import { ChallengeCard } from '@/components/analytics/ChallengeCard';
import { MicroChallengeCreationModal } from '@/components/analytics/MicroChallengeCreationModal';
import { MicroChallengeCard } from '@/components/analytics/MicroChallengeCard';

import { ChallengesFeed } from '@/components/analytics/ChallengesFeed';
import { UserChallengeParticipations } from '@/components/analytics/UserChallengeParticipations';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { MyFriendsTab } from '@/components/social/MyFriendsTab';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';
import { ChatroomManager } from '@/components/analytics/ChatroomManager';
import { SmartTeamUpPrompt } from '@/components/social/SmartTeamUpPrompt';
import { useRecoveryLeaderboard } from '@/hooks/useRecoveryLeaderboard';
import { useGameChallengeLeaderboard } from '@/hooks/useGameChallengeLeaderboard';
import { ChallengesTabs } from '@/components/challenges/ChallengesTabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Types
interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  reactions?: string[];
  isBot?: boolean;
}

// All mock data removed - now using real data from Supabase

// All mock data removed - now using real data from Supabase

// Minimal shell for bisection testing
export function GameAndChallengePageShell() {
  const { user } = useAuth(); // ok to read, no other custom hooks
  console.log('[Bisect] Shell mounted, uid:', user?.id ?? null);
  return <div style={{padding:24}}>SHELL OK</div>;
}

// Minimal page with just ChallengesFeed for bisection testing
export function GameAndChallengePage_Min() {
  const [showCreate, setShowCreate] = useState(false);
  const [nudge, setNudge] = useState(0);
  
  console.log("[Bisect] Min page mounted");
  
  const handleCreated = useCallback(() => {
    console.log("[Bisect] challenge created → refresh feed");
    setNudge((n) => n + 1); // local state to bump a key on ChallengesFeed
    setShowCreate(false);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: "white", marginBottom: 12 }}>Challenges</h2>
      <button onClick={() => setShowCreate(true)}>+ Create Challenge</button>
      <ChallengeCreationModal
        open={showCreate}
        onOpenChange={setShowCreate}
        defaultVisibility="public"
        onChallengeCreated={handleCreated}
      />
      <Suspense fallback={<div style={{color:"white"}}>Loading…</div>}>
        <ChallengesFeed key={nudge} />
      </Suspense>
    </div>
  );
}

export default function GameAndChallengePage() {
  return (
    <RewardsProvider>
      <ChatProvider>
        <ChallengeProvider>
          <GameAndChallengePageTabs />
        </ChallengeProvider>
      </ChatProvider>
    </RewardsProvider>
  );
}

function GameAndChallengePageTabs() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/explore')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Challenges
            </h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 py-6">
        <ChallengesTabs />
      </div>
    </div>
  );
}

function GameAndChallengeContent() {
  if (import.meta.env.DEV) console.log("[hooks-order-ok] GameAndChallengeContent");
  
  const { challenges, quickChallenges, joinChallenge } = usePublicChallenges();
  const { setIsChatModalOpen } = useChatModal();
  const { user: currentUser } = useAuth();
  const uid = currentUser?.id ?? null;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { optimizeForMobile, shouldLazyLoad } = useMobileOptimization({
    enableLazyLoading: true,
    memoryThreshold: 0.7,
    storageQuotaCheck: true
  });

  const [activeSection, setActiveSection] = useState('ranking');
  const [chatMessage, setChatMessage] = useState('');
  const [isChatCollapsed, setIsChatCollapsed] = useState(isMobile);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sortBy, setSortBy] = useState('score');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeModalVisibility, setChallengeModalVisibility] = useState<'public' | 'private'>('public');
  const [showMicroChallengeModal, setShowMicroChallengeModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserStatsOpen, setIsUserStatsOpen] = useState(false);
  const [isChatroomManagerOpen, setIsChatroomManagerOpen] = useState(false);
  const [challengeMode, setChallengeMode] = useState<'nutrition' | 'exercise' | 'recovery' | 'combined'>('combined');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Recovery leaderboard hook
  const { leaderboard: recoveryLeaderboard, loading: recoveryLoading } = useRecoveryLeaderboard();
  
  // Real challenge leaderboards
  const { leaderboard: nutritionLeaderboard, isLoading: nutritionLoading } = useGameChallengeLeaderboard('nutrition');
  const { leaderboard: exerciseLeaderboard, isLoading: exerciseLoading } = useGameChallengeLeaderboard('exercise');
  const { leaderboard: recoveryRealLeaderboard, isLoading: recoveryRealLoading } = useGameChallengeLeaderboard('recovery');
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Update chat modal state in context when chatroom manager opens/closes
  useEffect(() => {
    setIsChatModalOpen(isChatroomManagerOpen);
  }, [isChatroomManagerOpen, setIsChatModalOpen]);

  // Get real leaderboard data based on challenge mode
  let currentLeaderboard;
  let isLoading = false;
  let isEmpty = false;
  
  switch (challengeMode) {
    case 'nutrition':
      currentLeaderboard = nutritionLeaderboard.currentUserGroup;
      isLoading = nutritionLoading;
      isEmpty = nutritionLeaderboard.isEmpty;
      break;
    case 'exercise':
      currentLeaderboard = exerciseLeaderboard.currentUserGroup;
      isLoading = exerciseLoading;
      isEmpty = exerciseLeaderboard.isEmpty;
      break;
    case 'recovery':
      currentLeaderboard = recoveryRealLeaderboard.currentUserGroup;
      isLoading = recoveryRealLoading;
      isEmpty = recoveryRealLeaderboard.isEmpty;
      break;
    case 'combined':
    default:
      // Use nutrition leaderboard as default for combined view
      currentLeaderboard = nutritionLeaderboard.currentUserGroup;
      isLoading = nutritionLoading;
      isEmpty = nutritionLeaderboard.isEmpty;
      break;
  }
  
  const optimizedLeaderboard = optimizeForMobile(currentLeaderboard);
  const optimizedFriends = optimizeForMobile([]);
  const optimizedHallOfFame = optimizeForMobile([]);

  // Mobile pull-to-refresh
  const handleRefresh = async () => {
    if (!isMobile) return;
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    
    // Handle chat section specially to open chatroom manager
    if (sectionId === 'chat') {
      setIsChatroomManagerOpen(true);
      return;
    }
    
    // Always scroll to the top of the page for consistency
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: "You 🌟",
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollContainer = document.getElementById('mobile-chat-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const quickEmojis = ['😆', '🔥', '👏', '🥦', '🍩', '💪', '🚀', '⭐'];

  const navigationItems = [
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'my-friends', label: 'My Friends', icon: Users },
    { id: 'challenges', label: 'Browse', icon: Target },
    { id: 'my-challenges', label: 'My Challenges', icon: Star },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'winners', label: 'Winners', icon: Crown },
    { id: 'hall-of-fame', label: 'Hall of Fame', icon: Medal }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Sticky Header - Outside the main container */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {isMobile ? (
            // Mobile Tab Navigation
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/explore')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Game & Challenge</h1>
                <div className="w-10"></div> {/* Spacer for balance */}
              </div>
              
              {/* Mobile horizontal scroll tabs */}
              <ScrollArea className="w-full">
                <div className="flex justify-between w-full pb-3 pt-1 px-2">
                  {navigationItems.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      variant={activeSection === id ? "default" : "ghost"}
                      onClick={() => scrollToSection(id)}
                      className="flex items-center justify-center h-12 w-12 p-0 rounded-full"
                      size="sm"
                    >
                      <Icon className="h-6 w-6" />
                    </Button>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Challenge Mode Toggle - Mobile */}
              {activeSection !== 'my-friends' && activeSection !== 'chat' && (
                <div className="flex justify-center mt-2">
                  <ToggleGroup 
                    type="single" 
                    value={challengeMode} 
                    onValueChange={(value) => value && setChallengeMode(value as 'nutrition' | 'exercise' | 'recovery' | 'combined')}
                    className="bg-muted/50 rounded-full p-1"
                  >
                    <ToggleGroupItem 
                      value="nutrition" 
                      className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Nutrition
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="exercise" 
                      className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Exercise
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="recovery" 
                      className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Recovery
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="combined" 
                      className="rounded-full text-xs px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Combined
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>
          ) : (
            // Desktop Navigation
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/explore')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center justify-center">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Game & Challenge</h1>
                </div>
                <div className="w-10"></div> {/* Spacer for balance */}
              </div>
              
              {/* Challenge Mode Toggle - Desktop */}
              {activeSection !== 'my-friends' && activeSection !== 'chat' && (
                <div className="flex justify-center">
                  <ToggleGroup 
                    type="single" 
                    value={challengeMode} 
                    onValueChange={(value) => value && setChallengeMode(value as 'nutrition' | 'exercise' | 'recovery' | 'combined')}
                    className="bg-muted/50 rounded-full p-1"
                  >
                    <ToggleGroupItem 
                      value="nutrition" 
                      className="rounded-full px-4 py-2 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Nutrition
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="exercise" 
                      className="rounded-full px-4 py-2 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Exercise
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="recovery" 
                      className="rounded-full px-4 py-2 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Recovery
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="combined" 
                      className="rounded-full px-4 py-2 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm"
                    >
                      Combined
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>
          )}
          
          {/* Sort Controls - Responsive */}
          {activeSection === 'ranking' && (
            <div className={cn(
              "flex items-center gap-2 mt-2",
              isMobile ? "justify-between" : "justify-center gap-4"
            )}>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>Sort:</span>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className={cn(isMobile ? "w-32 h-8 text-xs" : "w-40")}>
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent className="bg-background border z-50">
                   {challengeMode === 'recovery' ? (
                     <>
                       <SelectItem value="score">Recovery Score</SelectItem>
                       <SelectItem value="sessions">Total Sessions</SelectItem>
                       <SelectItem value="streak">Current Streak</SelectItem>
                       <SelectItem value="improvement">Most Improved</SelectItem>
                     </>
                   ) : (
                     <>
                       <SelectItem value="score">Score</SelectItem>
                       <SelectItem value="consistency">Consistency</SelectItem>
                       <SelectItem value="improvement">Most Improved</SelectItem>
                     </>
                   )}
                 </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="overflow-x-hidden w-full max-w-full relative">
        {/* Mystery Boxes - Hidden on mobile for performance */}
        {/* Mystery Box is now global - removed from here */}

        {/* Pull to Refresh Indicator */}
        {isRefreshing && isMobile && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm animate-pulse">
            Refreshing...
          </div>
        )}

        {/* Main Content */}
        <div className={cn(
          "container mx-auto space-y-6 sm:space-y-12",
          isMobile ? "px-2 py-4" : "px-4 py-8 pb-20"
        )}>
          
          {/* Ranking Arena Section - Hidden on mobile since it's in tabs */}
          {!isMobile && (
            <section id="ranking" className="animate-fade-in">
            <Card className={cn(
              "overflow-hidden border-2 shadow-xl",
              challengeMode === 'recovery' 
                ? "border-teal-200/30 bg-gradient-to-br from-teal-50/50 to-purple-50/50 dark:from-teal-950/20 dark:to-purple-950/20"
                : "border-primary/20"
            )}>
              <CardHeader className={cn(
                challengeMode === 'recovery' 
                  ? "bg-gradient-to-r from-teal-100/60 to-purple-100/60 dark:from-teal-950/30 dark:to-purple-950/30"
                  : "bg-gradient-to-r from-primary/10 to-secondary/10",
                isMobile ? "p-4" : "p-6"
              )}>
                <div className={cn(
                  "flex items-center",
                  isMobile ? "flex-col space-y-2" : "justify-between"
                )}>
                  <CardTitle className={cn(
                    "font-bold flex items-center gap-2",
                    isMobile ? "text-xl text-center" : "text-3xl gap-3"
                  )}>
                     {challengeMode === 'recovery' ? (
                       <>
                         <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
                         Live Rankings Arena
                         <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
                       </>
                     ) : (
                       <>
                         <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
                         Live Rankings Arena
                         <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
                       </>
                     )}
                  </CardTitle>
                  
                  {/* Create Challenge Button */}
                  <Button 
                    onClick={() => {
                      setChallengeModalVisibility('public');
                      setShowChallengeModal(true);
                    }}
                    className={cn(
                      "flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg",
                      isMobile ? "h-8 px-3 text-xs w-full" : ""
                    )}
                    size={isMobile ? "sm" : "default"}
                  >
                    <Plus className="h-4 w-4" />
                    <span className={isMobile ? "text-xs" : ""}>Create Challenge</span>
                  </Button>
                </div>
              </CardHeader>
               <CardContent className={cn(isMobile ? "p-3" : "p-6")}>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl border-2 border-purple-100 dark:border-purple-900/20">
                          <div className="w-8 h-8 bg-teal-200 dark:bg-teal-800 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-3/4"></div>
                            <div className="h-3 bg-purple-100 dark:bg-purple-900 rounded w-1/2"></div>
                          </div>
                          <div className="w-12 h-6 bg-teal-100 dark:bg-teal-900 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : isEmpty ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">
                        {challengeMode === 'nutrition' ? '🥗' : challengeMode === 'exercise' ? '💪' : '🧘‍♂️'}
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-teal-700 dark:text-teal-300">
                        {challengeMode === 'nutrition' && "No challengers yet! Time to be the first to rise 💪"}
                        {challengeMode === 'exercise' && "No workout warriors yet! Time to be the first to rise 💪"}
                        {challengeMode === 'recovery' && "No recovery warriors yet! Time to be the first to rise 💪"}
                        {challengeMode === 'combined' && "No challengers yet! Time to be the first to rise 💪"}
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {challengeMode === 'nutrition' && "Start logging your meals to appear on the nutrition leaderboard!"}
                        {challengeMode === 'exercise' && "Start completing workouts to appear on the exercise leaderboard!"}
                        {challengeMode === 'recovery' && "Start your meditation, breathing, yoga, sleep, or recovery journey to appear on the leaderboard!"}
                        {challengeMode === 'combined' && "Start your fitness journey to appear on the leaderboard!"}
                      </p>
                      <Button 
                        onClick={() => {
                          if (challengeMode === 'nutrition') window.location.href = '/nutrition';
                          else if (challengeMode === 'exercise') window.location.href = '/exercise-hub';
                          else if (challengeMode === 'recovery') window.location.href = '/exercise-hub?tab=recovery';
                          else window.location.href = '/home';
                        }}
                        className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white"
                      >
                        <span className="mr-2">
                          {challengeMode === 'nutrition' ? '🥗' : challengeMode === 'exercise' ? '💪' : '🧘'}
                        </span>
                        Start Your Journey
                      </Button>
                    </div>
                   ) : (
                    <div className={cn(isMobile ? "space-y-2" : "space-y-4")}>
                      {/* Coach CTA for Recovery Leaderboard */}
                      {challengeMode === 'recovery' && !isMobile && (
                        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-teal-100/50 to-purple-100/50 dark:from-teal-950/20 dark:to-purple-950/20 border border-teal-200/30">
                          <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">
                            🌟 Try to reach the top 10 in Recovery! Practice daily meditation, breathing, or yoga to climb the ranks.
                          </p>
                        </div>
                      )}
                      {currentLeaderboard.map((user) => (
                      <div
                       key={user.id}
                       className={cn(
                         "relative rounded-xl border-2 transition-all duration-500 cursor-pointer",
                         isMobile ? "p-3 hover:scale-[1.01]" : "p-4 hover:scale-[1.02]",
                         user.isCurrentUser 
                           ? challengeMode === 'recovery'
                             ? "border-teal-400 bg-teal-50/50 dark:bg-teal-950/20 shadow-lg shadow-teal-200/20 ring-2 ring-teal-300/30"
                             : "border-primary bg-primary/5 shadow-lg shadow-primary/20 ring-2 ring-primary/30"
                           : challengeMode === 'recovery'
                             ? "border-purple-200/40 bg-purple-50/30 dark:bg-purple-950/10 hover:border-teal-300/60"
                             : "border-muted bg-muted/30 hover:border-primary/40"
                       )}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsUserStatsOpen(true);
                      }}
                    >
                      
                       <div className={cn(
                         "flex items-center",
                         isMobile ? "flex-col space-y-3" : "justify-between"
                       )}>
                         <div className={cn(
                           "flex items-center",
                           isMobile ? "w-full justify-center gap-3" : "gap-4"
                         )}>
                            <div className={cn(
                              "font-bold text-muted-foreground",
                              isMobile ? "text-lg" : "text-2xl"
                            )}>
                             {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `#${user.rank}`}
                            </div>
                           
                              {/* Enhanced Progress Avatar - showStats=false to only show name */}
                              <ProgressAvatar 
                                avatar={user.avatar}
                                nickname={user.nickname}
                                weeklyProgress={user.weeklyProgress}
                                dailyStreak={user.dailyStreak}
                                weeklyStreak={user.weeklyStreak}
                                size={isMobile ? "sm" : "md"}
                                showStats={false}
                                isCurrentUser={user.isCurrentUser}
                                name={user.isCurrentUser ? 
                                  (currentUser?.first_name && currentUser?.last_name ? 
                                    `${currentUser.first_name} ${currentUser.last_name}` : 
                                    currentUser?.first_name || currentUser?.name) : 
                                  (user.first_name && user.last_name ? 
                                    `${user.first_name} ${user.last_name}` : 
                                    user.first_name || user.name)}
                                email={user.isCurrentUser ? currentUser?.email : user.email}
                                avatar_url={user.isCurrentUser ? currentUser?.avatar_url : user.avatar_url}
                              />
                          
                             {!isMobile && (
                               <div className="flex items-center gap-3 text-sm">
                                 <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                                   <CheckCircle className="h-3 w-3 text-green-600" />
                                   <span className="text-green-700 dark:text-green-400 font-medium">
                                     {challengeMode === 'recovery' ? 
                                       `${(user as any).totalSessions || 0} sessions` :
                                       `${user.mealsLoggedThisWeek}/${user.totalMealsThisWeek}`
                                     }
                                   </span>
                                 </div>
                                 <Badge variant="outline" className="text-xs">
                                   Score: {user.score}
                                 </Badge>
                               </div>
                             )}
                        </div>
                        
                        <div className={cn(
                          "flex items-center",
                          isMobile ? "w-full justify-between text-xs" : "gap-6"
                        )}>
                          {/* Mobile: Compact display */}
                           {isMobile ? (
                               <div className="flex items-center gap-2">
                                 <Badge variant="secondary" className="text-xs px-1">
                                   🥇{user.gold}
                                 </Badge>
                                 <Badge variant="secondary" className="text-xs px-1">
                                   Score: {user.score}
                                 </Badge>
                                <div className="flex items-center gap-1 text-green-600">
                                 {user.improvement > 0 ? (
                                   <>
                                     <TrendingUp className="h-3 w-3" />
                                     <span className="text-xs">+{user.improvement}</span>
                                   </>
                                 ) : (
                                   <>
                                     <TrendingDown className="h-3 w-3" />
                                     <span className="text-xs">{user.improvement}</span>
                                   </>
                                 )}
                               </div>
                             </div>
                          ) : (
                            <>
                              {/* Desktop: Full display */}
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
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                      ))}
                    </div>
                 )}
               </CardContent>
            </Card>
          </section>
          )}

          {/* Mobile-Optimized Tabs for All Sections */}
          {isMobile ? (
            <Tabs value={activeSection} onValueChange={(value) => {
              if (value === 'chat') {
                setIsChatroomManagerOpen(true);
              } else {
                setActiveSection(value);
              }
            }} className="w-full flex flex-col">

              <TabsContent value="ranking" className="mt-4">
                {/* Mobile Ranking Section */}
                <Card className={cn(
                  "overflow-hidden border-2 shadow-xl",
                  challengeMode === 'recovery' 
                    ? "border-teal-200/30 bg-gradient-to-br from-teal-50/50 to-purple-50/50 dark:from-teal-950/20 dark:to-purple-950/20"
                    : "border-primary/20"
                )}>
                  <CardHeader className={cn(
                    challengeMode === 'recovery' 
                      ? "bg-gradient-to-r from-teal-100/60 to-purple-100/60 dark:from-teal-950/30 dark:to-purple-950/30"
                      : "bg-gradient-to-r from-primary/10 to-secondary/10",
                    "p-4"
                  )}>
                    <div className="flex flex-col space-y-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-center justify-center">
                          {challengeMode === 'recovery' ? (
                            <>
                              <Trophy className="h-6 w-6 text-yellow-500" />
                              Live Rankings Arena
                              <Trophy className="h-6 w-6 text-yellow-500" />
                            </>
                          ) : (
                            <>
                              <Trophy className="h-6 w-6 text-yellow-500" />
                              Live Rankings Arena
                              <Trophy className="h-6 w-6 text-yellow-500" />
                            </>
                          )}
                        </CardTitle>
                      
                      {/* Create Challenge Button */}
                      <Button 
                        onClick={() => {
                          setChallengeModalVisibility('public');
                          setShowChallengeModal(true);
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg h-8 px-3 text-xs w-full"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Challenge
                      </Button>
                    </div>
                  </CardHeader>
                   <CardContent className="p-3">
                      {isLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg border">
                              <div className="w-8 h-8 bg-teal-200 dark:bg-teal-800 rounded-full"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-3/4"></div>
                                <div className="h-3 bg-purple-100 dark:bg-purple-900 rounded w-1/2"></div>
                              </div>
                              <div className="w-12 h-6 bg-teal-100 dark:bg-teal-900 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : isEmpty ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-4">
                            {challengeMode === 'nutrition' ? '🥗' : challengeMode === 'exercise' ? '💪' : '🧘‍♂️'}
                          </div>
                          <h3 className="text-lg font-semibold mb-2 text-teal-700 dark:text-teal-300">
                            {challengeMode === 'recovery' ? "You're the first challenger! Time to inspire others 🔥" : "No challengers yet! Time to be the first to rise 💪"}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            Start your {challengeMode} journey today!
                          </p>
                          <Button 
                            onClick={() => {
                              if (challengeMode === 'nutrition') window.location.href = '/nutrition';
                              else if (challengeMode === 'exercise') window.location.href = '/exercise-hub';
                              else window.location.href = '/exercise-hub?tab=recovery';
                            }}
                            className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white text-xs"
                            size="sm"
                          >
                            Start Journey
                          </Button>
                        </div>
                      ) : (
                       <div className="space-y-2">
                         {currentLeaderboard.map((user, index) => (
                         <div
                           key={user.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg transition-all duration-300 border cursor-pointer min-h-[60px]",
                              user.isCurrentUser 
                                ? "bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30 shadow-md"
                                : "bg-muted/30 border-muted hover:bg-muted/50 hover:shadow-md"
                            )}
                           onClick={() => {
                             setSelectedUser(user);
                             setIsUserStatsOpen(true);
                           }}
                         >
                           <div className="flex items-center gap-3 flex-1 min-w-0">
                             <div className={cn(
                               "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm flex-shrink-0",
                               index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white" :
                               index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white" :
                               index === 2 ? "bg-gradient-to-r from-amber-500 to-amber-700 text-white" :
                               "bg-muted text-muted-foreground"
                             )}>
                               {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${user.rank}`}
                             </div>
                             
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                               <div className="text-lg flex-shrink-0">{user.avatar}</div>
                               <div className="flex-1 min-w-0">
                                 <div className="font-semibold text-sm flex items-center gap-1 truncate">
                                   <span className="truncate">{user.nickname}</span>
                                   {user.isCurrentUser && (
                                     <Badge variant="secondary" className="text-xs h-5 flex-shrink-0">YOU</Badge>
                                   )}
                                 </div>
                                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                     <span>Score: {user.score}</span>
                                     <span>•</span>
                                     <span>{user.weeklyProgress}%</span>
                                   </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end">
                               <div className="flex items-center gap-1 text-xs">
                                 <Flame className="h-3 w-3 text-orange-500" />
                                 <span>{(user as any).currentStreak || user.streak || 0}d</span>
                               </div>
                             
                             <div className="flex items-center gap-1 mt-1">
                               {user.improvement > 0 ? (
                                 <>
                                   <TrendingUp className="h-3 w-3 text-green-600" />
                                   <span className="text-xs text-green-600">+{user.improvement}</span>
                                 </>
                               ) : (
                                 <>
                                   <TrendingDown className="h-3 w-3" />
                                   <span className="text-xs">{user.improvement}</span>
                                 </>
                               )}
                             </div>
                           </div>
                         </div>
                          ))}
                       </div>
                     )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="challenges" className="mt-4">
                {/* Mobile Challenge Action Buttons */}
                {isMobile && (
                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        // Scroll to challenges feed if already visible, or it's a no-op since we're already there
                        const challengeSection = document.querySelector('[data-challenge-feed]');
                        if (challengeSection) {
                          challengeSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Browse Public
                    </Button>
                    <Button
                      onClick={() => {
                        setChallengeModalVisibility('private');
                        setShowChallengeModal(true);
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Lock className="h-4 w-4" />
                      Create Private
                    </Button>
                  </div>
                )}
                <div data-challenge-feed>
                  <ChallengesFeed onCreate={() => {
                    setChallengeModalVisibility('public');
                    setShowChallengeModal(true);
                  }} />
                </div>
              </TabsContent>

              <TabsContent value="my-challenges" className="mt-4 overflow-x-hidden w-full max-w-full">
                <div className="space-y-8">
                  <UserChallengeParticipations challengeMode={challengeMode} />
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-0 -mt-4">
                {/* Chat is now handled by ChatroomManager */}
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Challenge Chatrooms</h3>
                  <p className="text-muted-foreground mb-4">
                    Chat with participants in your active challenges
                  </p>
                  <Button 
                    onClick={() => setIsChatroomManagerOpen(true)}
                    className="bg-gradient-to-r from-primary to-purple-600"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open Chatrooms
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="winners" className="mt-4">
                <MonthlyTrophyPodium />
              </TabsContent>

              <TabsContent value="my-friends" className="mt-4">
                <MyFriendsTab />
              </TabsContent>

              <TabsContent value="hall-of-fame" className="mt-4">
                <HallOfFame champions={optimizedHallOfFame} />
              </TabsContent>
            </Tabs>
          ) : (
            // Desktop sections
            <>
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
                          <Card key={challenge.id} className="border border-border bg-card hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg">{challenge.title}</h3>
                                <span className="text-lg">{challenge.cover_emoji || '🏆'}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {challenge.description || 'Join this public challenge!'}
                              </p>
                              <Badge variant="secondary" className="mb-3">Public</Badge>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  👥 {challenge.participant_count} participants
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => joinChallenge(challenge.id)}
                                  className="text-xs"
                                >
                                  Join
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Target className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No public challenges yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Create one to get started!
                        </p>
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
                  
                  {quickChallenges.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {quickChallenges.map((challenge) => (
                        <Card key={challenge.id} className="min-w-64 border border-border bg-card">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{challenge.cover_emoji || '⚡'}</span>
                              <h3 className="font-semibold text-sm">{challenge.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {challenge.description || 'Quick challenge!'}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                👥 {challenge.participant_count}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => joinChallenge(challenge.id)}
                                className="text-xs h-7"
                              >
                                Join
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
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
                <FriendsArena friends={optimizedFriends} />
              </section>

              {/* Chat Window Panel - Updated to use ChatroomManager */}
              <section id="chat" className="animate-fade-in">
                <Card className="overflow-hidden border-2 border-secondary/20 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-secondary/10 to-primary/10">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-6 w-6 text-secondary" />
                        Challenge Chatrooms
                        <Badge variant="secondary">Multi-Room</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-6 text-center">
                    <div className="space-y-4">
                      <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Challenge Chatrooms</h3>
                        <p className="text-muted-foreground">
                          Chat with participants in your active challenges. Each challenge has its own dedicated chatroom.
                        </p>
                      </div>
                      <Button 
                        onClick={() => setIsChatroomManagerOpen(true)}
                        className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Open Chatrooms
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Podium of the Month Section */}
              <section id="winners" className="animate-fade-in">
                <MonthlyTrophyPodium />
              </section>

              {/* Hall of Fame Section */}
              <section id="hall-of-fame" className="animate-fade-in">
                <HallOfFame champions={optimizedHallOfFame} challengeMode={challengeMode} />
              </section>
            </>
          )}

          {/* Challenge Creation Modals */}
          <ChallengeCreationModal
            open={showChallengeModal}
            onOpenChange={setShowChallengeModal}
            defaultVisibility={challengeModalVisibility}
            onChallengeCreated={() => {
              // Refresh challenges data when a new challenge is created
              console.log('Challenge created, refreshing data');
            }}
          />

          <MicroChallengeCreationModal
            open={showMicroChallengeModal}
            onOpenChange={setShowMicroChallengeModal}
          />

        </div>

        {/* User Stats Modal */}
        {selectedUser && (
          <UserStatsModal
            isOpen={isUserStatsOpen}
            onClose={() => {
              setIsUserStatsOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        )}

        {/* Chatroom Manager */}
        <ChatroomManager
          isOpen={isChatroomManagerOpen}
          onOpenChange={setIsChatroomManagerOpen}
        />
        
        {/* Smart Team-Up Prompts */}
        <SmartTeamUpPrompt />
      </div>
    </div>
  );
}
