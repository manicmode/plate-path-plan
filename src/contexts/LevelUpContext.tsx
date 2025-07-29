import React, { createContext, useContext, ReactNode } from 'react';
import { useUserLevel } from '@/hooks/useUserLevel';
import { LevelUpModal } from '@/components/workout/LevelUpModal';

interface LevelUpContextType {
  userLevel: any;
  refreshLevel: () => Promise<void>;
  triggerLevelCheck: () => Promise<void>;
}

const LevelUpContext = createContext<LevelUpContextType | undefined>(undefined);

export const LevelUpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userLevel, levelUpData, refreshLevel, clearLevelUp } = useUserLevel();

  const triggerLevelCheck = async () => {
    await refreshLevel();
  };

  return (
    <LevelUpContext.Provider value={{ userLevel, refreshLevel, triggerLevelCheck }}>
      {children}
      
      {/* Level Up Modal */}
      {levelUpData?.isLevelUp && (
        <LevelUpModal
          isOpen={true}
          onClose={clearLevelUp}
          newLevel={levelUpData.newLevel}
          xpToNext={levelUpData.xpToNext}
        />
      )}
    </LevelUpContext.Provider>
  );
};

export const useLevelUp = () => {
  const context = useContext(LevelUpContext);
  if (context === undefined) {
    throw new Error('useLevelUp must be used within a LevelUpProvider');
  }
  return context;
};