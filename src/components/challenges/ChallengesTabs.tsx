import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Target, Globe, Lock, Trophy } from 'lucide-react';
import { MyChallengesFeed } from './MyChallengesFeed';
import { PublicChallengesFeed } from './PublicChallengesFeed';
import { PrivateChallengesFeed } from './PrivateChallengesFeed';
import { HallOfFameFeed } from './HallOfFameFeed';
import { useMyChallenges } from '@/hooks/useMyChallenges';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

export const ChallengesTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState("my");
  const { data: myChallenges } = useMyChallenges();
  const { challenges: publicChallenges } = usePublicChallenges();
  const { challengesWithParticipation: privateChallenges } = usePrivateChallenges();

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Log counts after mount for verification
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log(`[gac] tabs ready`);
      console.log(`[gac] my=${myChallenges.length} public=${publicChallenges.length} private=${privateChallenges.length}`);
    }, 1000);

    return () => clearTimeout(timer);
  }, [myChallenges.length, publicChallenges.length, privateChallenges.length]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger 
          value="my" 
          data-testid="tab-my"
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          My
        </TabsTrigger>
        <TabsTrigger 
          value="public" 
          data-testid="tab-public"
          className="flex items-center gap-2"
        >
          <Globe className="h-4 w-4" />
          Public
        </TabsTrigger>
        <TabsTrigger 
          value="private" 
          data-testid="tab-private"
          className="flex items-center gap-2"
        >
          <Lock className="h-4 w-4" />
          Private
        </TabsTrigger>
        <TabsTrigger 
          value="hall-of-fame" 
          data-testid="tab-hof"
          className="flex items-center gap-2"
        >
          <Trophy className="h-4 w-4" />
          Hall of Fame
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <TabsContent value="my" className="mt-0">
          <ErrorBoundary>
            <div data-testid="feed-my">
              <MyChallengesFeed />
            </div>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="public" className="mt-0">
          <ErrorBoundary>
            <div data-testid="feed-public">
              <PublicChallengesFeed />
            </div>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="private" className="mt-0">
          <ErrorBoundary>
            <div data-testid="feed-private">
              <PrivateChallengesFeed />
            </div>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="hall-of-fame" className="mt-0">
          <ErrorBoundary>
            <HallOfFameFeed />
          </ErrorBoundary>
        </TabsContent>
      </div>
    </Tabs>
  );
};