import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Reward {
  type: 'motivation' | 'badge' | 'streak_booster';
  title: string;
  description: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface RewardHistory {
  date: string;
  rewardType: string;
  description: string;
  emoji: string;
}

interface RewardsContextType {
  canClaimBox: boolean;
  mysteryBoxLastClaimed: string | null;
  rewardHistory: RewardHistory[];
  claimMysteryBox: () => Reward | null;
  timeUntilNextBox: number; // in milliseconds
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const useRewards = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    // ✅ FALLBACK: Return safe defaults instead of throwing error
    return {
      canClaimBox: false,
      mysteryBoxLastClaimed: null,
      rewardHistory: [],
      claimMysteryBox: () => null,
      timeUntilNextBox: 0,
    };
  }
  return context;
};

interface RewardsProviderProps {
  children: ReactNode;
}

// Reward pools with different rarities
const rewardPools: Record<Reward['rarity'], Reward[]> = {
  common: [
    { type: 'motivation', title: 'Keep Going!', description: "You're doing amazing! Every meal logged counts!", emoji: '🌟', rarity: 'common' },
    { type: 'motivation', title: 'Consistency King!', description: 'Your dedication is inspiring others!', emoji: '👑', rarity: 'common' },
    { type: 'motivation', title: 'Health Hero!', description: 'Every healthy choice makes you stronger!', emoji: '💪', rarity: 'common' },
    { type: 'motivation', title: 'Progress Master!', description: 'Small steps lead to big changes!', emoji: '🎯', rarity: 'common' },
  ],
  rare: [
    { type: 'badge', title: 'Meal Logging Streaker', description: 'Awarded for consistent meal tracking!', emoji: '🔥', rarity: 'rare' },
    { type: 'badge', title: 'Hydration Hero', description: 'Champion of staying hydrated!', emoji: '💧', rarity: 'rare' },
    { type: 'badge', title: 'Veggie Warrior', description: 'Master of green nutrition!', emoji: '🥬', rarity: 'rare' },
    { type: 'badge', title: 'Challenge Champion', description: 'Leader in community challenges!', emoji: '🏆', rarity: 'rare' },
  ],
  legendary: [
    { type: 'streak_booster', title: '1-Day Grace Pass', description: 'Skip a day without breaking your streak!', emoji: '⚡', rarity: 'legendary' },
    { type: 'streak_booster', title: 'Double XP Weekend', description: 'Earn 2x points for the next 48 hours!', emoji: '🚀', rarity: 'legendary' },
    { type: 'streak_booster', title: 'Perfect Week Bonus', description: 'Instant +100 points boost!', emoji: '💎', rarity: 'legendary' },
  ]
};

const STORAGE_KEY = 'mystery_box_data';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const RewardsProvider: React.FC<RewardsProviderProps> = ({ children }) => {
  const [mysteryBoxLastClaimed, setMysteryBoxLastClaimed] = useState<string | null>(null);
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
  const [timeUntilNextBox, setTimeUntilNextBox] = useState<number>(0);

  // Load data from localStorage on mount
  useEffect(() => {
    // 🔒 DOM GUARD: Only access localStorage on client side
    if (typeof window === 'undefined') return;
    
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { lastClaimed, history } = JSON.parse(savedData);
        setMysteryBoxLastClaimed(lastClaimed);
        setRewardHistory(history || []);
      } catch (error) {
        console.error('Error loading mystery box data:', error);
      }
    }
  }, []);

  // Calculate time until next box
  useEffect(() => {
    const updateTimeUntilNext = () => {
      if (!mysteryBoxLastClaimed) {
        setTimeUntilNextBox(0);
        return;
      }

      const lastClaimedTime = new Date(mysteryBoxLastClaimed).getTime();
      const nextAvailableTime = lastClaimedTime + WEEK_IN_MS;
      const now = Date.now();
      const timeLeft = Math.max(0, nextAvailableTime - now);
      
      setTimeUntilNextBox(timeLeft);
    };

    updateTimeUntilNext();
    const interval = setInterval(updateTimeUntilNext, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [mysteryBoxLastClaimed]);

  // Save data to localStorage
  const saveData = (lastClaimed: string | null, history: RewardHistory[]) => {
    // 🔒 DOM GUARD: Only access localStorage on client side
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      lastClaimed,
      history
    }));
  };

  const canClaimBox = () => {
    if (!mysteryBoxLastClaimed) return true;
    
    const lastClaimedTime = new Date(mysteryBoxLastClaimed).getTime();
    const now = Date.now();
    return (now - lastClaimedTime) >= WEEK_IN_MS;
  };

  const getRandomReward = (): Reward => {
    const rand = Math.random();
    
    // 80% common, 15% rare, 5% legendary
    let rarity: Reward['rarity'];
    if (rand < 0.8) {
      rarity = 'common';
    } else if (rand < 0.95) {
      rarity = 'rare';
    } else {
      rarity = 'legendary';
    }

    const pool = rewardPools[rarity];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const claimMysteryBox = (): Reward | null => {
    if (!canClaimBox()) return null;

    const reward = getRandomReward();
    const now = new Date().toISOString();
    
    const newHistoryEntry: RewardHistory = {
      date: now,
      rewardType: reward.title,
      description: reward.description,
      emoji: reward.emoji,
    };

    const updatedHistory = [newHistoryEntry, ...rewardHistory.slice(0, 9)]; // Keep last 10
    
    setMysteryBoxLastClaimed(now);
    setRewardHistory(updatedHistory);
    saveData(now, updatedHistory);

    return reward;
  };

  const value: RewardsContextType = {
    canClaimBox: canClaimBox(),
    mysteryBoxLastClaimed,
    rewardHistory,
    claimMysteryBox,
    timeUntilNextBox,
  };

  return (
    <RewardsContext.Provider value={value}>
      {children}
    </RewardsContext.Provider>
  );
};