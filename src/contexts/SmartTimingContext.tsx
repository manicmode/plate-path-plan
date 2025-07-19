import React, { createContext, useContext, ReactNode } from 'react';
import { useSmartTimingController } from '@/hooks/useSmartTimingController';

interface SmartTimingContextType {
  shouldShowTeamUpPrompt: () => boolean;
  registerLogCompletion: (logType: 'nutrition' | 'hydration' | 'supplement') => void;
  registerDismissal: () => void;
  canShowAfterLog: () => boolean;
  canShowAfterDismissal: () => boolean;
  timingState: {
    hasLoggedToday: boolean;
    hasActiveStreak: boolean;
    isAppIdle: boolean;
    isOnValidPage: boolean;
    recentDismissalTime: number | null;
    lastLogTime: number | null;
  };
}

const SmartTimingContext = createContext<SmartTimingContextType | undefined>(undefined);

export const useSmartTiming = () => {
  const context = useContext(SmartTimingContext);
  if (!context) {
    throw new Error('useSmartTiming must be used within a SmartTimingProvider');
  }
  return context;
};

interface SmartTimingProviderProps {
  children: ReactNode;
}

export const SmartTimingProvider: React.FC<SmartTimingProviderProps> = ({ children }) => {
  const timingController = useSmartTimingController();

  return (
    <SmartTimingContext.Provider value={timingController}>
      {children}
    </SmartTimingContext.Provider>
  );
};