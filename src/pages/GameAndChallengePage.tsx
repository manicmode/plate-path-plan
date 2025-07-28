import React, { useState, useEffect } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
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
  Lock
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
import { MysteryBox } from '@/components/analytics/MysteryBox';
import { PublicChallengesBrowse } from '@/components/analytics/PublicChallengesBrowse';
import { UserChallengeParticipations } from '@/components/analytics/UserChallengeParticipations';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { MyFriendsTab } from '@/components/social/MyFriendsTab';
import { useChallenge } from '@/contexts/ChallengeContext';
import { cn } from '@/lib/utils';
import { ChatroomManager } from '@/components/analytics/ChatroomManager';
import { SmartTeamUpPrompt } from '@/components/social/SmartTeamUpPrompt';
import { useRecoveryLeaderboard } from '@/hooks/useRecoveryLeaderboard';

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
  { 
    id: 1, 
    nickname: "Alex 🦄", 
    avatar: "🦄", 
    month: "December", 
    year: "2024", 
    score: 2850, 
    quote: "Beast Mode Activated 💪", 
    achievement: "🏆 December 2024 Champion", 
    trophy: "gold" as const,
    user_id: "123e4567-e89b-12d3-a456-426614174000" // Added user_id
  },
  { 
    id: 2, 
    nickname: "Luna 🌙", 
    avatar: "🌙", 
    month: "November", 
    year: "2024", 
    score: 2720, 
    quote: "Consistency is Key 🗝️", 
    achievement: "🏆 November 2024 Champion", 
    trophy: "gold" as const,
    user_id: "223e4567-e89b-12d3-a456-426614174001" // Added user_id
  },
  { 
    id: 3, 
    nickname: "Phoenix 🔥", 
    avatar: "🔥", 
    month: "October", 
    year: "2024", 
    score: 2650, 
    quote: "Rise from the Ashes 🔥", 
    achievement: "🏆 October 2024 Champion", 
    trophy: "gold" as const,
    user_id: "323e4567-e89b-12d3-a456-426614174002" // Added user_id
  },
  { 
    id: 4, 
    nickname: "Storm ⚡", 
    avatar: "⚡", 
    month: "September", 
    year: "2024", 
    score: 2580, 
    quote: "Electrifying Performance ⚡", 
    achievement: "🏆 September 2024 Champion", 
    trophy: "gold" as const,
    user_id: "423e4567-e89b-12d3-a456-426614174003" // Added user_id
  },
  { 
    id: 5, 
    nickname: "Zen Master 🧘", 
    avatar: "🧘", 
    month: "August", 
    year: "2024", 
    score: 2320, 
    quote: "Mind over matter, always", 
    achievement: "🥈 Most Consistent in August", 
    trophy: "silver" as const,
    user_id: "523e4567-e89b-12d3-a456-426614174004" // Added user_id
  },
  { 
    id: 6, 
    nickname: "Iron Will 💪", 
    avatar: "💪", 
    month: "July", 
    year: "2024", 
    score: 2145, 
    quote: "Every rep counts!", 
    achievement: "🥉 Most Improved in July", 
    trophy: "bronze" as const,
    user_id: "623e4567-e89b-12d3-a456-426614174005" // Added user_id
  },
  { 
    id: 7, 
    nickname: "Green Goddess 🌱", 
    avatar: "🌱", 
    month: "June", 
    year: "2024", 
    score: 2890, 
    quote: "Plants are power!", 
    achievement: "🏆 June 2024 Champion", 
    trophy: "gold" as const,
    user_id: "723e4567-e89b-12d3-a456-426614174006" // Added user_id
  },
  { 
    id: 8, 
    nickname: "Sunshine ☀️", 
    avatar: "☀️", 
    month: "May", 
    year: "2024", 
    score: 2076, 
    quote: "Bright days ahead!", 
    achievement: "⭐ Positivity Award May", 
    trophy: "special" as const,
    user_id: "823e4567-e89b-12d3-a456-426614174007" // Added user_id
  },
  { 
    id: 9, 
    nickname: "Ocean Wave 🌊", 
    avatar: "🌊", 
    month: "April", 
    year: "2024", 
    score: 2234, 
    quote: "Flow like water", 
    achievement: "🥈 Hydration Hero April", 
    trophy: "silver" as const,
    user_id: "923e4567-e89b-12d3-a456-426614174008" // Added user_id
  },
  { 
    id: 10, 
    nickname: "Mountain Peak ⛰️", 
    avatar: "⛰️", 
    month: "March", 
    year: "2024", 
    score: 2567, 
    quote: "Reach new heights!", 
    achievement: "🏆 March 2024 Champion", 
    trophy: "gold" as const,
    user_id: "a23e4567-e89b-12d3-a456-426614174009" // Added user_id
  },
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
      <ChatProvider>
        <ChallengeProvider>
          <GameAndChallengeContent />
        </ChallengeProvider>
      </ChatProvider>
    </RewardsProvider>
  );
}

function GameAndChallengeContent() {
  const { challenges, microChallenges, nudgeFriend } = useChallenge();
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
  const [challengeMode, setChallengeMode] = useState<'nutrition' | 'exercise' | 'recovery' | 'combined'>('combined');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Recovery leaderboard hook
  const { leaderboard: recoveryLeaderboard, loading: recoveryLoading } = useRecoveryLeaderboard();
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Update chat modal state in context when chatroom manager opens/closes
  useEffect(() => {
    setIsChatModalOpen(isChatroomManagerOpen);
  }, [isChatroomManagerOpen, setIsChatModalOpen]);

  // Optimize data for mobile and handle recovery mode with sorting
  let currentLeaderboard;
  
  if (challengeMode === 'recovery') {
    // Apply sorting for recovery leaderboard
    currentLeaderboard = [...recoveryLeaderboard].sort((a, b) => {
      switch (sortBy) {
        case 'sessions':
          return b.totalSessions - a.totalSessions;
        case 'streak':
          return b.currentStreak - a.currentStreak;
        case 'improvement':
          return b.improvement - a.improvement;
        default: // 'score'
          return b.score - a.score;
      }
    }).map((user, index) => ({ ...user, rank: index + 1 }));
  } else {
    currentLeaderboard = mockLeaderboard;
  }
  
  const optimizedLeaderboard = optimizeForMobile(currentLeaderboard);
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Sticky Header - Outside the main container */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {isMobile ? (
            // Mobile Tab Navigation
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <Link to="/explore">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
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
                <Link to="/explore">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
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
        {!isMobile && (
          <>
            <MysteryBox position="top-right" />
            <MysteryBox position="bottom-left" />
          </>
        )}

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
                 {challengeMode === 'recovery' && recoveryLoading ? (
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
                 ) : challengeMode === 'recovery' && optimizedLeaderboard.length === 0 ? (
                   <div className="text-center py-12">
                     <div className="text-6xl mb-4">🧘‍♂️</div>
                     <h3 className="text-xl font-semibold mb-2 text-teal-700 dark:text-teal-300">No Recovery Warriors Yet</h3>
                     <p className="text-muted-foreground mb-6">
                       Start your meditation, breathing, yoga, sleep, or thermotherapy journey to appear on the leaderboard!
                     </p>
                     <Button 
                       onClick={() => window.location.href = '/exercise-hub?tab=recovery'}
                       className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white"
                     >
                       <span className="mr-2">🧘</span>
                       Start Recovery Journey
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
                      {optimizedLeaderboard.map((user) => (
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
                            {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `#${user.rank}`}
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
                     {challengeMode === 'recovery' && recoveryLoading ? (
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
                     ) : challengeMode === 'recovery' && optimizedLeaderboard.length === 0 ? (
                       <div className="text-center py-12">
                         <div className="text-4xl mb-4">🧘‍♂️</div>
                         <h3 className="text-lg font-semibold mb-2 text-teal-700 dark:text-teal-300">No Recovery Warriors Yet</h3>
                         <p className="text-muted-foreground text-sm mb-4">
                           Start your recovery journey today! 🧘🌿
                         </p>
                         <Button 
                           onClick={() => window.location.href = '/exercise-hub?tab=recovery'}
                           className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white text-xs"
                           size="sm"
                         >
                           <span className="mr-1">🧘</span>
                           Start Recovery
                         </Button>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         {optimizedLeaderboard.map((user, index) => (
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
                <PublicChallengesBrowse challengeMode={challengeMode} />
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
    </div>
  );
}
