import React, { useState, useEffect } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { OptimizedChallengeProvider } from '@/contexts/OptimizedChallengeProvider';
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
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ProgressAvatar } from '@/components/analytics/ui/ProgressAvatar';
import { FriendsArena } from '@/components/analytics/FriendsArena';
import { MonthlyTrophyPodium } from '@/components/analytics/MonthlyTrophyPodium';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';
import { ChallengeCard } from '@/components/analytics/ChallengeCard';
import { MicroChallengeCreationModal } from '@/components/analytics/MicroChallengeCreationModal';
import { MicroChallengeCard } from '@/components/analytics/MicroChallengeCard';
import { MysteryBox } from '@/components/analytics/MysteryBox';
import { PublicChallengesBrowse } from '@/components/analytics/PublicChallengesBrowse';
import { UserChallengeParticipations } from '@/components/analytics/UserChallengeParticipations';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { MyFriendsTab } from '@/components/social/MyFriendsTab';
import { useActiveChallenges } from '@/contexts/OptimizedChallengeProvider';
import { cn } from '@/lib/utils';
import { ChatroomManager } from '@/components/analytics/ChatroomManager';
import { SmartTeamUpPrompt } from '@/components/social/SmartTeamUpPrompt';
import { SocialBoostsDemo } from '@/components/social/SocialBoostsDemo';

// Types
interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
  reactions?: string[];
  isBot?: boolean;
}

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
  { 
    id: 6, 
    nickname: "Luna 🌙", 
    avatar: "🌙", 
    score: 78, 
    streak: 7, 
    gold: 0, 
    silver: 2, 
    bronze: 1, 
    rank: 6, 
    isCurrentUser: false, 
    consistency: 82, 
    improvement: 3,
    mealsLoggedThisWeek: 5,
    totalMealsThisWeek: 7,
    weeklyProgress: 71,
    dailyStreak: 7,
    weeklyStreak: 1
  },
  { 
    id: 7, 
    nickname: "Phoenix 🔥", 
    avatar: "🔥", 
    score: 75, 
    streak: 4, 
    gold: 1, 
    silver: 0, 
    bronze: 1, 
    rank: 7, 
    isCurrentUser: false, 
    consistency: 78, 
    improvement: -2,
    mealsLoggedThisWeek: 4,
    totalMealsThisWeek: 7,
    weeklyProgress: 57,
    dailyStreak: 4,
    weeklyStreak: 0
  },
  { 
    id: 8, 
    nickname: "Storm ⚡", 
    avatar: "⚡", 
    score: 72, 
    streak: 9, 
    gold: 0, 
    silver: 1, 
    bronze: 2, 
    rank: 8, 
    isCurrentUser: false, 
    consistency: 85, 
    improvement: 7,
    mealsLoggedThisWeek: 6,
    totalMealsThisWeek: 7,
    weeklyProgress: 86,
    dailyStreak: 9,
    weeklyStreak: 1
  },
  { 
    id: 9, 
    nickname: "Zen 🧘", 
    avatar: "🧘", 
    score: 69, 
    streak: 11, 
    gold: 0, 
    silver: 0, 
    bronze: 3, 
    rank: 9, 
    isCurrentUser: false, 
    consistency: 88, 
    improvement: 9,
    mealsLoggedThisWeek: 6,
    totalMealsThisWeek: 7,
    weeklyProgress: 86,
    dailyStreak: 11,
    weeklyStreak: 2
  },
  { 
    id: 10, 
    nickname: "Tiger 🐅", 
    avatar: "🐅", 
    score: 66, 
    streak: 2, 
    gold: 0, 
    silver: 1, 
    bronze: 1, 
    rank: 10, 
    isCurrentUser: false, 
    consistency: 62, 
    improvement: -8,
    mealsLoggedThisWeek: 3,
    totalMealsThisWeek: 7,
    weeklyProgress: 43,
    dailyStreak: 2,
    weeklyStreak: 0
  },
  { 
    id: 11, 
    nickname: "Ocean 🌊", 
    avatar: "🌊", 
    score: 63, 
    streak: 6, 
    gold: 0, 
    silver: 0, 
    bronze: 2, 
    rank: 11, 
    isCurrentUser: false, 
    consistency: 75, 
    improvement: 4,
    mealsLoggedThisWeek: 5,
    totalMealsThisWeek: 7,
    weeklyProgress: 71,
    dailyStreak: 6,
    weeklyStreak: 0
  },
  { 
    id: 12, 
    nickname: "Blaze 🔥", 
    avatar: "🔥", 
    score: 60, 
    streak: 1, 
    gold: 0, 
    silver: 0, 
    bronze: 1, 
    rank: 12, 
    isCurrentUser: false, 
    consistency: 58, 
    improvement: -12,
    mealsLoggedThisWeek: 2,
    totalMealsThisWeek: 7,
    weeklyProgress: 29,
    dailyStreak: 1,
    weeklyStreak: 0
  },
  { 
    id: 13, 
    nickname: "Nova ⭐", 
    avatar: "⭐", 
    score: 57, 
    streak: 8, 
    gold: 0, 
    silver: 0, 
    bronze: 1, 
    rank: 13, 
    isCurrentUser: false, 
    consistency: 80, 
    improvement: 6,
    mealsLoggedThisWeek: 5,
    totalMealsThisWeek: 7,
    weeklyProgress: 71,
    dailyStreak: 8,
    weeklyStreak: 1
  },
  { 
    id: 14, 
    nickname: "Echo 📢", 
    avatar: "📢", 
    score: 54, 
    streak: 3, 
    gold: 0, 
    silver: 0, 
    bronze: 0, 
    rank: 14, 
    isCurrentUser: false, 
    consistency: 68, 
    improvement: -1,
    mealsLoggedThisWeek: 4,
    totalMealsThisWeek: 7,
    weeklyProgress: 57,
    dailyStreak: 3,
    weeklyStreak: 0
  },
  { 
    id: 15, 
    nickname: "Frost ❄️", 
    avatar: "❄️", 
    score: 51, 
    streak: 5, 
    gold: 0, 
    silver: 0, 
    bronze: 1, 
    rank: 15, 
    isCurrentUser: false, 
    consistency: 72, 
    improvement: 2,
    mealsLoggedThisWeek: 4,
    totalMealsThisWeek: 7,
    weeklyProgress: 57,
    dailyStreak: 5,
    weeklyStreak: 0
  },
  { 
    id: 16, 
    nickname: "Comet 🌟", 
    avatar: "🌟", 
    score: 48, 
    streak: 0, 
    gold: 0, 
    silver: 0, 
    bronze: 0, 
    rank: 16, 
    isCurrentUser: false, 
    consistency: 55, 
    improvement: -15,
    mealsLoggedThisWeek: 1,
    totalMealsThisWeek: 7,
    weeklyProgress: 14,
    dailyStreak: 0,
    weeklyStreak: 0
  },
  { 
    id: 17, 
    nickname: "Ember 🔥", 
    avatar: "🔥", 
    score: 45, 
    streak: 2, 
    gold: 0, 
    silver: 0, 
    bronze: 0, 
    rank: 17, 
    isCurrentUser: false, 
    consistency: 60, 
    improvement: -7,
    mealsLoggedThisWeek: 3,
    totalMealsThisWeek: 7,
    weeklyProgress: 43,
    dailyStreak: 2,
    weeklyStreak: 0
  },
  { 
    id: 18, 
    nickname: "Spark ⚡", 
    avatar: "⚡", 
    score: 42, 
    streak: 4, 
    gold: 0, 
    silver: 0, 
    bronze: 0, 
    rank: 18, 
    isCurrentUser: false, 
    consistency: 65, 
    improvement: 1,
    mealsLoggedThisWeek: 3,
    totalMealsThisWeek: 7,
    weeklyProgress: 43,
    dailyStreak: 4,
    weeklyStreak: 0
  },
  { 
    id: 19, 
    nickname: "Vibe 🎵", 
    avatar: "🎵", 
    score: 39, 
    streak: 1, 
    gold: 0, 
    silver: 0, 
    bronze: 0, 
    rank: 19, 
    isCurrentUser: false, 
    consistency: 52, 
    improvement: -10,
    mealsLoggedThisWeek: 2,
    totalMealsThisWeek: 7,
    weeklyProgress: 29,
    dailyStreak: 1,
    weeklyStreak: 0
  },
  { 
    id: 20, 
    nickname: "Drift 🌪️", 
    avatar: "🌪️", 
    score: 36, 
    streak: 0, 
    gold: 0, 
    silver: 0, 
    bronze: 0, 
    rank: 20, 
    isCurrentUser: false, 
    consistency: 48, 
    improvement: -18,
    mealsLoggedThisWeek: 1,
    totalMealsThisWeek: 7,
    weeklyProgress: 14,
    dailyStreak: 0,
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
  console.log('GameAndChallengePage: Page component mounting');
  
  return (
    <RewardsProvider>
      <ChatProvider>
        <OptimizedChallengeProvider>
          <GameAndChallengeContent />
        </OptimizedChallengeProvider>
      </ChatProvider>
    </RewardsProvider>
  );
}

function GameAndChallengeContent() {
  console.log('GameAndChallengeContent: Content component mounting');
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Initialize component with error handling
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('GameAndChallengeContent: Starting initialization');
        
        // Small delay to allow contexts to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsInitialized(true);
        console.log('GameAndChallengeContent: Initialization complete');
      } catch (err) {
        console.error('GameAndChallengeContent: Initialization error:', err);
        setInitError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    };
    
    initializeComponent();
  }, []);

  // Early loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Loading Game & Challenge</h3>
            <p className="text-muted-foreground">Setting up your challenges...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Initialization Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              {initError}
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <GameAndChallengeMainContent />;
}

function GameAndChallengeMainContent() {
  // Wrap the main content in a try-catch for additional safety
  try {
    const { activeChallenges, microChallenges, loading, error } = useActiveChallenges();
    const { setIsChatModalOpen } = useChatModal();
    const isMobile = useIsMobile();
    const { optimizeForMobile, shouldLazyLoad } = useMobileOptimization({
      enableLazyLoading: true,
      memoryThreshold: 0.7,
      storageQuotaCheck: true
    });

    const [activeSection, setActiveSection] = useState('ranking');
    const [chatMessage, setChatMessage] = useState('');
    const [isChatCollapsed, setIsChatCollapsed] = useState(isMobile);
    const [messages, setMessages] = useState(mockChatMessages);
    const [sortBy, setSortBy] = useState('score');
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [showMicroChallengeModal, setShowMicroChallengeModal] = useState(false);
    const [showRewardBox, setShowRewardBox] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isUserStatsOpen, setIsUserStatsOpen] = useState(false);
    const [isChatroomManagerOpen, setIsChatroomManagerOpen] = useState(false);
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Use the scroll-to-top hook
    useScrollToTop();

    console.log('GameAndChallengeMainContent: Rendering with data', {
      activeChallengesCount: activeChallenges.length,
      microChallengesCount: microChallenges.length,
      loading,
      error
    });

    // Show loading state while contexts are loading
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">Loading Challenges</h3>
              <p className="text-muted-foreground">Fetching your challenge data...</p>
            </div>
          </Card>
        </div>
      );
    }

    // Show error state if there's a context error
    if (error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Challenge Data Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center">
                {error}
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Update chat modal state in context when chatroom manager opens/closes
    useEffect(() => {
      setIsChatModalOpen(isChatroomManagerOpen);
    }, [isChatroomManagerOpen, setIsChatModalOpen]);

    // Optimize data for mobile
    const optimizedLeaderboard = optimizeForMobile(mockLeaderboard);
    const optimizedFriends = optimizeForMobile(mockFriends);
    const optimizedHallOfFame = optimizeForMobile(mockHallOfFame);

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
      
      // Get the target element
      const element = document.getElementById(sectionId);
      if (!element) return;
      
      // Calculate offset for sticky header (approximate height)
      const headerOffset = isMobile ? 120 : 140; // Adjust based on header height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerOffset;
      
      // Smooth scroll to the calculated position
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
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
      <div className="overflow-x-hidden w-full max-w-full min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 relative">
        {/* Mystery Boxes - Hidden on mobile for performance */}
        {!isMobile && (
          <>
            <MysteryBox position="top-right" />
            <MysteryBox position="bottom-left" />
          </>
        )}

        {/* Mobile-Optimized Navigation - Fixed positioning */}
        <div className="sticky top-0 z-40 bg-background/50 backdrop-blur-md border-b border-border/50">
          <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
            {isMobile ? (
              // Mobile Tab Navigation
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-center">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Game & Challenge</h1>
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
              </div>
            ) : null}
            
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
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="consistency">Consistency</SelectItem>
                    <SelectItem value="improvement">Most Improved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

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
              <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
                <CardHeader className={cn(
                  "bg-gradient-to-r from-primary/10 to-secondary/10",
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
                      <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
                      Live Rankings Arena
                      <Trophy className={cn(isMobile ? "h-6 w-6" : "h-8 w-8", "text-yellow-500")} />
                    </CardTitle>
                    
                    {/* Create Challenge Button */}
                    <Button 
                      onClick={() => setShowChallengeModal(true)}
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
                  <div className={cn(isMobile ? "space-y-2" : "space-y-4")}>
                    {optimizedLeaderboard.map((user, index) => (
                      <div
                        key={user.id}
                        className={cn(
                          "relative rounded-xl border-2 transition-all duration-500 cursor-pointer",
                          isMobile ? "p-3 hover:scale-[1.01]" : "p-4 hover:scale-[1.02]",
                          user.isCurrentUser 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20 ring-2 ring-primary/30" 
                            : "border-muted bg-muted/30 hover:border-primary/40"
                        )}
                        onClick={() => {
                          setSelectedUser(user);
                          setIsUserStatsOpen(true);
                        }}
                      >
                        {user.isCurrentUser && (
                          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold">
                            YOU
                          </div>
                        )}
                        
                        <div className={cn(
                          "flex items-center",
                          isMobile ? "flex-col space-y-2" : "justify-between"
                        )}>
                          <div className={cn(
                            "flex items-center",
                            isMobile ? "w-full justify-between" : "gap-4"
                          )}>
                            <div className={cn(
                              "font-bold text-muted-foreground",
                              isMobile ? "text-lg w-8" : "text-2xl w-8"
                            )}>
                              #{user.rank}
                            </div>
                            
                            {/* Enhanced Progress Avatar */}
                            <ProgressAvatar 
                              avatar={user.avatar}
                              nickname={user.nickname}
                              weeklyProgress={user.weeklyProgress}
                              dailyStreak={user.dailyStreak}
                              weeklyStreak={user.weeklyStreak}
                              size={isMobile ? "sm" : "md"}
                            />
                            
                            {!isMobile && (
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

              <TabsContent value="ranking" className="mt-4 pb-32">
                {/* Mobile Ranking Section */}
                <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
                    <div className="flex flex-col space-y-2">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-center justify-center">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        Live Rankings Arena
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      </CardTitle>
                      
                      {/* Create Challenge Button */}
                      <Button 
                        onClick={() => setShowChallengeModal(true)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg h-8 px-3 text-xs w-full"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Challenge
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {optimizedLeaderboard.map((user, index) => (
                        <div
                          key={user.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg transition-all duration-300 border cursor-pointer",
                            user.isCurrentUser 
                              ? "bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30 shadow-md" 
                              : "bg-muted/30 border-muted hover:bg-muted/50 hover:shadow-md"
                          )}
                          onClick={() => {
                            setSelectedUser(user);
                            setIsUserStatsOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                              index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white" :
                              index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white" :
                              index === 2 ? "bg-gradient-to-r from-amber-500 to-amber-700 text-white" :
                              "bg-muted text-muted-foreground"
                            )}>
                              #{user.rank}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-lg">{user.avatar}</div>
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-1">
                                  {user.nickname}
                                  {user.isCurrentUser && (
                                    <Badge variant="secondary" className="text-xs h-5">YOU</Badge>
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
                              <span>{user.streak}d</span>
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="challenges" className="mt-4 pb-32">
                <PublicChallengesBrowse />
              </TabsContent>

              <TabsContent value="my-challenges" className="mt-4 pb-32 overflow-x-hidden w-full max-w-full">
                <div className="space-y-8">
                  <UserChallengeParticipations />
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-0 pb-32 -mt-4">
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

              <TabsContent value="winners" className="mt-4 pb-32">
                <MonthlyTrophyPodium />
              </TabsContent>

              <TabsContent value="my-friends" className="mt-4 pb-32">
                <MyFriendsTab />
              </TabsContent>

              <TabsContent value="hall-of-fame" className="mt-4 pb-32">
                <HallOfFame champions={optimizedHallOfFame} />
              </TabsContent>
              
              {/* Bottom Navigation Tabs */}
              <TabsList className="grid w-full grid-cols-7 h-14 mt-auto sticky bottom-0 bg-background/95 backdrop-blur-sm border-t">
                <TabsTrigger value="ranking" className="text-xs py-2 flex flex-col items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>Rank</span>
                </TabsTrigger>
                <TabsTrigger value="my-friends" className="text-xs py-2 flex flex-col items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Friends</span>
                </TabsTrigger>
                <TabsTrigger value="challenges" className="text-xs py-2 flex flex-col items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>Browse</span>
                </TabsTrigger>
                <TabsTrigger value="my-challenges" className="text-xs py-2 flex flex-col items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span>Mine</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="chat" 
                  className="text-xs py-2 flex flex-col items-center gap-1"
                  onClick={() => setIsChatroomManagerOpen(true)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger value="winners" className="text-xs py-2 flex flex-col items-center gap-1">
                  <Crown className="h-4 w-4" />
                  <span>Winners</span>
                </TabsTrigger>
                <TabsTrigger value="hall-of-fame" className="text-xs py-2 flex flex-col items-center gap-1">
                  <Medal className="h-4 w-4" />
                  <span>Fame</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
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
                    {activeChallenges.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {activeChallenges.map((challenge) => (
                          <Card key={challenge.id} className="p-4">
                            <h3 className="font-semibold">{challenge.name}</h3>
                            <p className="text-sm text-muted-foreground">{challenge.goalDescription}</p>
                            <div className="mt-2">
                              <div className="text-sm">Progress: {challenge.progress}%</div>
                              <div className="text-sm">Streak: {challenge.streakCount} days</div>
                            </div>
                          </Card>
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
                <div className="mt-6">
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
                        <Card key={challenge.id} className="min-w-[300px] p-4">
                          <h3 className="font-semibold">{challenge.name}</h3>
                          <p className="text-sm text-muted-foreground">{challenge.goalDescription}</p>
                          <div className="mt-2">
                            <div className="text-sm">Progress: {challenge.progress}%</div>
                            <div className="text-sm">Days left: {challenge.durationDays}</div>
                          </div>
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
                <HallOfFame champions={optimizedHallOfFame} />
              </section>

              {/* Social Boosts Demo Section */}
              <section id="social-boosts" className="animate-fade-in">
                <SocialBoostsDemo />
              </section>
            </>
          )}

          {/* Challenge Creation Modals */}
          <ChallengeCreationModal
            open={showChallengeModal}
            onOpenChange={setShowChallengeModal}
            friends={optimizedFriends}
          />

          <MicroChallengeCreationModal
            open={showMicroChallengeModal}
            onOpenChange={setShowMicroChallengeModal}
          />

          {/* Mobile-Optimized Mystery Reward Box */}
          <div className={cn(
            "fixed z-40",
            isMobile 
              ? "bottom-4 right-4" 
              : "bottom-6 right-6"
          )}>
            <Button
              onClick={() => setShowRewardBox(!showRewardBox)}
              className={cn(
                "rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-2xl",
                isMobile 
                  ? "w-12 h-12 animate-pulse" 
                  : "w-16 h-16 animate-bounce"
              )}
              size="sm"
            >
              <Gift className={cn(isMobile ? "h-6 w-6" : "h-8 w-8")} />
            </Button>
            
            {showRewardBox && (
              <div className={cn(
                "absolute bg-background border rounded-lg p-3 shadow-xl animate-scale-in",
                isMobile 
                  ? "bottom-14 right-0 w-48" 
                  : "bottom-20 right-0"
              )}>
                <h4 className={cn("font-bold mb-2", isMobile ? "text-sm" : "")}>🎁 Mystery Box</h4>
                <p className={cn("text-muted-foreground mb-3", isMobile ? "text-xs" : "text-sm")}>
                  Complete daily challenges to unlock rewards!
                </p>
                <Button size="sm" className="w-full">
                  Open Box
                </Button>
              </div>
            )}
          </div>
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
    );

  } catch (error) {
    console.error('GameAndChallengeMainContent render error:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Render Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              There was an error rendering the Game & Challenge page.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
