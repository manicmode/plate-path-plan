import React from 'react';
import { ActiveChallengesProvider } from './ActiveChallengesContext';
import { PublicChallengesProvider } from './PublicChallengesContext';
import { ChallengeParticipationProvider } from './ChallengeParticipationContext';

interface OptimizedChallengeProviderProps {
  children: React.ReactNode;
}

/**
 * Optimized Challenge Provider that wraps all challenge-related contexts
 * Each context is focused and only triggers re-renders for relevant components
 */
export const OptimizedChallengeProvider: React.FC<OptimizedChallengeProviderProps> = ({ children }) => {
  return (
    <ActiveChallengesProvider>
      <PublicChallengesProvider>
        <ChallengeParticipationProvider>
          {children}
        </ChallengeParticipationProvider>
      </PublicChallengesProvider>
    </ActiveChallengesProvider>
  );
};

// Export individual providers for granular usage
export { ActiveChallengesProvider, useActiveChallenges } from './ActiveChallengesContext';
export { PublicChallengesProvider, usePublicChallengesContext } from './PublicChallengesContext';
export { ChallengeParticipationProvider, useChallengeParticipation } from './ChallengeParticipationContext';