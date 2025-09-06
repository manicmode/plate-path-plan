import React, { useState, useEffect, useRef } from 'react';
import ArenaPanel from '@/components/arena/ArenaPanel';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useNavigate } from 'react-router-dom';
import { getScrollableAncestor } from '@/utils/scroll';
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

// Legacy FriendsArena removed - now using ArenaPanel only
import { MonthlyTrophyPodium } from '@/components/analytics/MonthlyTrophyPodium';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { arenaUiHeartbeat } from '@/lib/arenaDiag';
import { supabase } from '@/integrations/supabase/client';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';
import { ChallengeCard } from '@/components/analytics/ChallengeCard';
import { MicroChallengeCreationModal } from '@/components/analytics/MicroChallengeCreationModal';
import { MicroChallengeCard } from '@/components/analytics/MicroChallengeCard';

import { PublicChallengesBrowse } from '@/components/analytics/PublicChallengesBrowse';
import { UserChallengeParticipations } from '@/components/analytics/UserChallengeParticipations';
import { UserStatsModal } from '@/components/analytics/UserStatsModal';
import { MyFriendsTab } from '@/components/social/MyFriendsTab';
import { useChallenge } from '@/contexts/ChallengeContext';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';
import { lightTap } from '@/lib/haptics';
import { ChatroomManager } from '@/components/analytics/ChatroomManager';
import ChatroomDropdown from '@/components/analytics/ChatroomDropdown';
import { SmartTeamUpPrompt } from '@/components/social/SmartTeamUpPrompt';
import { useChatStore } from '@/store/chatStore';
import { BILLBOARD_ENABLED } from '@/config/flags';
import { FLAGS } from '@/constants/flags';
import { type ArenaSection } from '@/lib/arenaSections';
import BillboardTab from '@/components/billboard/BillboardTab';

// V2: Arena enrollment handled by useArenaEnroll() hook
import { toast } from "sonner";
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// Domain filtering utility
function applyDomainFilter<T extends { category?: string }>(
  items: T[],
  domain: 'nutrition' | 'exercise' | 'recovery' | 'combined'
) {
  if (domain === 'combined') return items;
  
  // Special case for recovery domain - includes multiple categories
  if (domain === 'recovery') {
    return items.filter(item => 
      ['meditation', 'breathing', 'yoga', 'sleep', 'thermotherapy', 'recovery'].includes(
        (item.category ?? '').toLowerCase()
      )
    );
  }
  
  return items.filter(item => (item.category ?? '').toLowerCase() === domain);
}

// Helper function to scroll to top of the nearest scrollable container
function scrollTopOfNearestScroller(el: HTMLElement | null) {
  const scrollerAny = getScrollableAncestor(el);
  // normalize to either window or an HTMLElement
  const scroller = scrollerAny === window ? window : (scrollerAny as HTMLElement);

  // read current scrollTop from the *same* scroller
  const currentTop =
    scroller === window
      ? (window.pageYOffset ?? document.scrollingElement?.scrollTop ?? document.documentElement.scrollTop ?? 0)
      : (scroller as HTMLElement).scrollTop;

  // skip only if truly at top (prevents micro-jiggle)
  if (currentTop <= 8) return;

  const opts: ScrollToOptions = { top: 0, behavior: "smooth" };

  // wait for content to mount/paint so sticky headers measure correctly
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (scroller === window) {
        // iOS Safari fallback if smooth not supported
        try { window.scrollTo(opts); } catch { window.scrollTo(0, 0); }
      } else {
        try { (scroller as HTMLElement).scrollTo(opts); } catch { (scroller as HTMLElement).scrollTo(0, 0); }
      }
    });
  });
}

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

// Component for ranking tab with dev heartbeat
const RankingTabContent = ({ challengeMode }: { challengeMode: ArenaSection }) => {
  useEffect(() => {
    arenaUiHeartbeat(supabase, 'ranking-mounted');
  }, []);

  return (
    <section id="live-rankings-arena" className="mt-0">
      <ArenaPanel challengeMode={challengeMode} />
    </section>
  );
};

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

// Named export for compatibility
export { GameAndChallengePage as GameAndChallengePage_Min };

function GameAndChallengeContent() {
  const { challenges, microChallenges, nudgeFriend } = useChallenge();
  const { setIsChatModalOpen } = useChatModal();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pageRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();

  // Prefetch challenge ID using safe server paths
  useEffect(() => {
    let canceled = false;
    (async () => {
      // V2: No more legacy rank20 prefetching
      arenaUiHeartbeat(supabase, 'arena-v2:loaded');
    })();
    return () => { canceled = true; };
  }, [queryClient]);

  
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
  const [showMicroChallengeModal, setShowMicroChallengeModal] = useState(false);
  
  // Track user intent to prevent auto-navigation
  const userInitiatedRef = React.useRef(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserStatsOpen, setIsUserStatsOpen] = useState(false);
  const [isChatroomManagerOpen, setIsChatroomManagerOpen] = useState(false);
  const [preselectedChatId, setPreselectedChatId] = useState<string | null>(null);
  const [challengeMode, setChallengeMode] = useState<ArenaSection>('combined');
  
  const { selectedChatroomId, selectChatroom } = useChatStore();
  const [searchParams] = useSearchParams();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Auto-scroll to top when challenge mode changes
  useEffect(() => {
    // Check for modal (common patterns)
    const hasModal = document.querySelector('[aria-hidden="true"]') || 
                    document.querySelector('[data-modal-open="true"]') ||
                    document.body.classList.contains('modal-open');
    if (hasModal) return;

    scrollTopOfNearestScroller(pageRef.current);
  }, [challengeMode]);

  // A. page-level heartbeat (fires once on page render)
  useEffect(() => {
    arenaUiHeartbeat(supabase, "gc:mounted");
  }, []);

  // B. ranking-active heartbeat (fires whenever the Ranking tab becomes active)
  useEffect(() => {
    if (activeSection === "ranking") {
      arenaUiHeartbeat(supabase, "ranking:active");
    }
  }, [activeSection]);

  // Cache hygiene for Arena V2
  useEffect(() => {
    // Keep Arena cache separate from domain lists
    queryClient.invalidateQueries({ queryKey: ['arena'] });
  }, [currentUser?.id, queryClient]);

  // Update chat modal state in context when chatroom manager opens/closes
  useEffect(() => {
    setIsChatModalOpen(isChatroomManagerOpen);
  }, [isChatroomManagerOpen, setIsChatModalOpen]);

  // Listen for "switch-to-chat-tab" events from challenge cards
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ challengeId?: string }>;
      if (ce.detail?.challengeId) {
        selectChatroom(ce.detail.challengeId);
        setPreselectedChatId(ce.detail.challengeId);
      }
      // Only allow programmatic navigation if user has initiated action
      if (userInitiatedRef.current) {
        setActiveSection(BILLBOARD_ENABLED ? 'billboard' : 'chat');
        
      }
    };
    window.addEventListener('switch-to-chat-tab', handler as EventListener);
    return () => window.removeEventListener('switch-to-chat-tab', handler as EventListener);
  }, [selectChatroom]);

  // If a chatroom is selected globally, open the chat tab/modal and preselect it
  useEffect(() => {
    if (selectedChatroomId && userInitiatedRef.current) {
      setActiveSection(BILLBOARD_ENABLED ? 'billboard' : 'chat');
      setIsChatroomManagerOpen(!BILLBOARD_ENABLED);
      setPreselectedChatId(selectedChatroomId);
    }
  }, [selectedChatroomId]);

  // Read query params and handle billboard navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    const type = searchParams.get("type");
    const privateChallengeId = searchParams.get("private_challenge_id");
    const publicChallengeId = searchParams.get("public_challenge_id");
    const challengeParam = searchParams.get("challenge");
    
    // Handle billboard navigation with context
    if (tab === "billboard" && type) {
      const challengeId = type === "private" ? privateChallengeId : 
                         type === "public" ? publicChallengeId :
                         type === "rank_of_20" ? privateChallengeId : null;
      
      if (challengeId) {
        console.log(`[Billboard] nav: type=${type} id=${challengeId}`);
        selectChatroom(challengeId);
        userInitiatedRef.current = true;
        setActiveSection('billboard');
      }
    }
    // Legacy challenge param support
    else if (challengeParam) {
      selectChatroom(challengeParam);
      userInitiatedRef.current = true;
      setActiveSection(BILLBOARD_ENABLED ? 'billboard' : 'chat');
    }
  }, [searchParams, selectChatroom]);

  // Block programmatic tab switches on first load
  useEffect(() => {
    // Any effect that used to flip to 'billboard' on data arrival would go here
    // but we block it with userInitiatedRef check
    if (!userInitiatedRef.current) return;
  }, []);

  // Measure sticky header height and apply top padding to chat scroller so content never hides beneath it
  useEffect(() => {
    if (activeSection !== (BILLBOARD_ENABLED ? 'billboard' : 'chat')) return;

    // Set a sensible default first
    document.documentElement.style.setProperty('--gc-header-h', '56px');

    const header = document.getElementById('gaming-sticky-header');
    const applyHeaderHeight = () => {
      const h = header?.offsetHeight ?? 56;
      document.documentElement.style.setProperty('--gc-header-h', `${h}px`);
    };

    applyHeaderHeight();

    let ro: ResizeObserver | undefined;
    if (header && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => applyHeaderHeight());
      ro.observe(header);
    }

    window.addEventListener('orientationchange', applyHeaderHeight);
    window.addEventListener('resize', applyHeaderHeight);

    const applyScrollPadding = () => {
      const scroller = document.getElementById('chat-inline-scroll') as HTMLElement | null;
      if (scroller) {
        scroller.style.paddingTop = 'var(--gc-header-h)';
      }
    };

    // Try now and shortly after mount in case the inner panel mounts async
    applyScrollPadding();
    const t = window.setTimeout(applyScrollPadding, 150);

    return () => {
      ro?.disconnect();
      window.removeEventListener('orientationchange', applyHeaderHeight);
      window.removeEventListener('resize', applyHeaderHeight);
      window.clearTimeout(t);
    };
  }, [activeSection]);


  // Mobile pull-to-refresh
  const handleRefresh = async () => {
    if (!isMobile) return;
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const onTabClick = (sectionId: string) => {
    console.log('[Header Section] activeSection:', sectionId, 'challengeMode:', challengeMode);
    userInitiatedRef.current = true;
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

  const navigationItems = BILLBOARD_ENABLED ? [
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'my-friends', label: 'My Friends', icon: Users },
    { id: 'challenges', label: 'Browse', icon: Target },
    { id: 'my-challenges', label: 'My Challenges', icon: Star },
    { id: 'billboard', label: 'Billboard', icon: MessageCircle },
    { id: 'winners', label: 'Winners', icon: Crown },
    { id: 'hall-of-fame', label: 'Hall of Fame', icon: Medal }
  ] : [
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'my-friends', label: 'My Friends', icon: Users },
    { id: 'challenges', label: 'Browse', icon: Target },
    { id: 'my-challenges', label: 'My Challenges', icon: Star },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'winners', label: 'Winners', icon: Crown },
    { id: 'hall-of-fame', label: 'Hall of Fame', icon: Medal }
  ];

  return (
    <div ref={pageRef}>
      {/* Sticky Header - Outside overflow container */}
      <div id="gaming-sticky-header" className="sticky top-0 z-[60] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4">
          {/* Unified mobile-style navigation for all sizes */}
          <div className="flex flex-col space-y-2 md:space-y-3 w-full">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/explore')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Game & Challenge</h1>
              <div className="w-10"></div>
            </div>
            {/* Horizontal scroll tabs (same as mobile) */}
            <ScrollArea className="w-full">
              <div className="flex justify-between w-full pb-3 pt-1 px-2">
                  {navigationItems.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      variant={activeSection === id ? "default" : "ghost"}
                      onClick={() => onTabClick(id)}
                      className="flex items-center justify-center h-12 w-12 p-0 rounded-full"
                      size="sm"
                    >
                      <Icon className="h-6 w-6" />
                    </Button>
                  ))}
              </div>
            </ScrollArea>
            {/* Challenge Mode Toggle - Show for all sections including ranking */}
            {(() => {
              const showHeaderSectionTabs = ['ranking', 'winners', 'hall-of-fame', 'challenges', 'my-challenges'].includes(activeSection);
              
              if (showHeaderSectionTabs) {
                console.log('[Header Tabs] visible for:', activeSection);
              }
              
              return showHeaderSectionTabs && (
                <div className="flex justify-center mt-2">
                  <ToggleGroup 
                    type="single" 
                    value={challengeMode} 
                      onValueChange={(value) => {
                       if (value) {
                          lightTap(); // Add haptic feedback
                         setChallengeMode(value as ArenaSection);
                       }
                     }}
                    className="bg-muted/50 rounded-full p-1"
                    data-testid="gc-header-section-tabs"
                  >
                    <ToggleGroupItem value="combined" className="rounded-full text-xs md:text-sm px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm" data-testid="gc-header-tab-combined">Combined</ToggleGroupItem>
                    <ToggleGroupItem value="nutrition" className="rounded-full text-xs md:text-sm px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm" data-testid="gc-header-tab-nutrition">Nutrition</ToggleGroupItem>
                    <ToggleGroupItem value="exercise" className="rounded-full text-xs md:text-sm px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm" data-testid="gc-header-tab-exercise">Exercise</ToggleGroupItem>
                    <ToggleGroupItem value="recovery" className="rounded-full text-xs md:text-sm px-3 py-1 font-medium transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:hover:bg-muted data-[state=on]:shadow-sm" data-testid="gc-header-tab-recovery">Recovery</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              );
            })()}
          </div>
          
          {/* Sort Controls - Responsive */}
          {activeSection === 'ranking' && (
            <div className={cn(
              "flex items-center gap-2 mt-2 justify-between md:justify-center md:gap-4"
            )}>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium text-xs md:text-sm">Sort:</span>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 h-8 text-xs md:w-40">
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
        {activeSection === (BILLBOARD_ENABLED ? 'billboard' : 'chat') && (
          <>
            {/* Dropdown under header; preserve its own background/classes */}
            <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8">
              <ChatroomDropdown />
            </div>
            {/* Thin separator below dropdown */}
            <div className="border-t border-white/10" />
          </>
        )}
      </div>

      {/* Main Content Container */}
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 w-full max-w-full relative">
        {/* Mystery Boxes - Hidden on mobile for performance */}
        {/* Mystery Box is now global - removed from here */}

        {/* Pull to Refresh Indicator */}
        {isRefreshing && isMobile && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm animate-pulse">
            Refreshing...
          </div>
        )}

          {/* Main Content */}
          <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8 pb-[90px] md:pb-[120px]">
            <div className={cn(
              "space-y-6 sm:space-y-12 py-4 md:py-8"
            )}>
          

          {/* Mobile-Optimized Tabs for All Sections */}
          <Tabs value={activeSection} onValueChange={(value) => {
            userInitiatedRef.current = true;
            if (value === 'chat') {
              setIsChatroomManagerOpen(true);
            } else {
              setActiveSection(value);
            }
          }} className="w-full flex flex-col">

              <TabsContent value="ranking" className="mt-0 -mx-4 sm:-mx-4 md:-mx-6 lg:-mx-8">
                <RankingTabContent challengeMode={challengeMode} />
              </TabsContent>

              <TabsContent value="challenges" className="mt-4">
                <PublicChallengesBrowse challengeMode={challengeMode} />
              </TabsContent>

              <TabsContent value="my-challenges" className="mt-4 overflow-x-hidden w-full max-w-full">
                <div className="space-y-8">
                  <UserChallengeParticipations challengeMode={challengeMode} />
                </div>
              </TabsContent>

              {BILLBOARD_ENABLED ? (
                <TabsContent value="billboard" className="mt-0">
                  <BillboardTab />
                  {process.env.NODE_ENV !== "production" && (
                    <div className="text-xs text-muted-foreground px-4 py-2">
                      Selected challenge: {selectedChatroomId ?? "(none)"}<br/>
                    </div>
                  )}
                </TabsContent>
              ) : (
                <TabsContent value="chat" className="mt-0">
                  <div id="chat-tab-root" className="relative min-h-[100dvh] overflow-hidden">
                    <ChatroomManager
                      inline
                      isOpen={true}
                      onOpenChange={(open) => { if (!open) setActiveSection('challenges'); }}
                      initialChatroomId={selectedChatroomId ?? undefined}
                    />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="winners" className="mt-4">
                <MonthlyTrophyPodium section={challengeMode} />
              </TabsContent>

              <TabsContent value="my-friends" className="mt-4">
                <MyFriendsTab />
              </TabsContent>

              <TabsContent value="hall-of-fame" className="mt-4">
                <HallOfFame champions={[]} challengeMode={challengeMode} />
              </TabsContent>
            </Tabs>
            

          {/* Challenge Creation Modals */}
          <ChallengeCreationModal
            open={showChallengeModal}
            onOpenChange={setShowChallengeModal}
            friends={[]}
          />

          <MicroChallengeCreationModal
            open={showMicroChallengeModal}
            onOpenChange={setShowMicroChallengeModal}
          />

        </div>
        </div>

        {/* User Stats Modal */}
        {selectedUser && (
          <UserStatsModal
            open={isUserStatsOpen}
            onClose={() => {
              setIsUserStatsOpen(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.id}
            displayName={selectedUser.nickname || selectedUser.first_name || 'User'}
            avatarUrl={selectedUser.avatar_url}
          />
        )}

        
        {/* Smart Team-Up Prompts */}
        <SmartTeamUpPrompt />
      </div>
    </div>
  );
}