import React, { useState, useEffect, Suspense } from 'react';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Target, Crown } from 'lucide-react';
import { RewardsProvider } from '@/contexts/RewardsContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Lazy load Arena components
const FriendsArena = React.lazy(() => import('@/components/analytics/FriendsArena').then(m => ({ default: m.FriendsArena })).catch(() => ({ default: () => React.createElement('div', {}, 'Arena temporarily unavailable — try again shortly.') })));
import { MonthlyTrophyPodium } from '@/components/analytics/MonthlyTrophyPodium';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { PublicChallengesBrowse } from '@/components/analytics/PublicChallengesBrowse';
import { MyFriendsTab } from '@/components/social/MyFriendsTab';

type SectionType = "ranking" | "friends" | "browse" | "awards";

// Individual pane components
const RankingPane = () => (
  <section data-testid="panel-ranking" className="mt-0 space-y-6">
    <Suspense fallback={<div className="p-4 text-center">Loading Arena...</div>}>
      <FriendsArena />
    </Suspense>
    <Suspense fallback={<div />}>
      <MonthlyTrophyPodium section="combined" />
    </Suspense>
    <Suspense fallback={<div />}>
      <HallOfFame champions={[]} challengeMode="combined" />
    </Suspense>
  </section>
);

const FriendsPane = () => (
  <section data-testid="panel-friends" className="mt-4">
    <Suspense fallback={<div className="p-4 text-center">Loading Friends...</div>}>
      <MyFriendsTab />
    </Suspense>
  </section>
);

const BrowsePane = () => (
  <section data-testid="panel-browse" className="mt-4">
    <Suspense fallback={<div className="p-4 text-center">Loading Browse...</div>}>
      <PublicChallengesBrowse challengeMode="combined" />
    </Suspense>
  </section>
);

const AwardsPane = () => (
  <section data-testid="panel-awards" className="mt-4 space-y-6">
    <h2 className="text-2xl font-bold text-center">AWARDS</h2>
    <Suspense fallback={<div />}>
      <MonthlyTrophyPodium section="combined" />
    </Suspense>
    <Suspense fallback={<div />}>
      <HallOfFame champions={[]} challengeMode="combined" />
    </Suspense>
  </section>
);

function GameAndChallengeContentStable() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionType>("ranking");
  
  // Use the scroll-to-top hook
  useScrollToTop();

  // Proof logging for section changes
  useEffect(() => {
    console.info("[GC] activeSection =", activeSection);
  }, [activeSection]);

  const onTabClick = (sectionId: SectionType) => {
    setActiveSection(sectionId);
    // Always scroll to the top of the page for consistency
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const navigationItems = [
    { id: 'ranking' as const, label: 'Ranking', icon: Trophy },
    { id: 'friends' as const, label: 'Friends', icon: Users },
    { id: 'browse' as const, label: 'Browse', icon: Target },
    { id: 'awards' as const, label: 'Awards', icon: Crown }
  ];

  // Render exactly one panel based on activeSection
  const renderActivePanel = () => {
    switch(activeSection) {
      case "ranking":   
        return <RankingPane />;
      case "friends":   
        return <FriendsPane />;
      case "browse":    
        return <BrowsePane />;
      case "awards":    
        return <AwardsPane />;
      default:          
        return null;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="relative bg-background border-b z-10">
        <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4">
          {/* Header navigation */}
          <div className="flex flex-col space-y-2 md:space-y-3 w-full">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/explore')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Game & Challenge</h1>
              <div className="w-10"></div>
            </div>
            
            {/* Navigation tabs */}
            <ScrollArea className="w-full">
              <div className="flex justify-between w-full pb-3 pt-1 px-2">
                {navigationItems.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    variant={activeSection === id ? "default" : "ghost"}
                    onClick={() => onTabClick(id)}
                    className="flex items-center justify-center h-12 w-12 p-0 rounded-full"
                    size="sm"
                    data-testid={id === 'ranking' ? 'nav-arena' : undefined}
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Main Content - render exactly one panel */}
      <div className="w-full max-w-none px-4 sm:px-4 md:px-6 lg:px-8 pb-[90px] md:pb-[120px]">
        <div className={cn("space-y-6 sm:space-y-12 py-4 md:py-8")}>
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}

export default function GameAndChallengePageStable() {
  return (
    <RewardsProvider>
      <ChatProvider>
        <ChallengeProvider>
          <GameAndChallengeContentStable />
        </ChallengeProvider>
      </ChatProvider>
    </RewardsProvider>
  );
}