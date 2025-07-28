import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface RecoveryLeaderboardUser {
  id: string;
  nickname: string;
  avatar: string;
  totalSessions: number;
  longestStreak: number;
  currentStreak: number;
  score: number;
  rank: number;
  isCurrentUser: boolean;
  weeklyProgress: number;
  improvement: number;
  meditationStreak: number;
  breathingStreak: number;
  yogaStreak: number;
  sleepStreak: number;
  thermotherapyStreak: number;
  dominantRecoveryType: string;
}

// Temporary mock data for testing Recovery Rankings UI
const mockRecoveryLeaderboard: RecoveryLeaderboardUser[] = [
  {
    id: "1",
    nickname: "Zen Master Alex 🧘",
    avatar: "🧘‍♂️",
    totalSessions: 156,
    longestStreak: 28,
    currentStreak: 15,
    score: 98,
    rank: 1,
    isCurrentUser: false,
    weeklyProgress: 95,
    improvement: 12,
    meditationStreak: 15,
    breathingStreak: 12,
    yogaStreak: 8,
    sleepStreak: 5,
    thermotherapyStreak: 3,
    dominantRecoveryType: "meditation"
  },
  {
    id: "2", 
    nickname: "Breathing Luna 🌬️",
    avatar: "🌬️",
    totalSessions: 142,
    longestStreak: 22,
    currentStreak: 18,
    score: 94,
    rank: 2,
    isCurrentUser: true,
    weeklyProgress: 88,
    improvement: 8,
    meditationStreak: 5,
    breathingStreak: 18,
    yogaStreak: 10,
    sleepStreak: 7,
    thermotherapyStreak: 2,
    dominantRecoveryType: "breathing"
  },
  {
    id: "3",
    nickname: "Yoga Phoenix 🧘‍♀️", 
    avatar: "🧘‍♀️",
    totalSessions: 128,
    longestStreak: 25,
    currentStreak: 12,
    score: 89,
    rank: 3,
    isCurrentUser: false,
    weeklyProgress: 82,
    improvement: 15,
    meditationStreak: 8,
    breathingStreak: 6,
    yogaStreak: 12,
    sleepStreak: 9,
    thermotherapyStreak: 4,
    dominantRecoveryType: "yoga"
  },
  {
    id: "4",
    nickname: "Sleep Storm 😴",
    avatar: "😴", 
    totalSessions: 115,
    longestStreak: 20,
    currentStreak: 14,
    score: 85,
    rank: 4,
    isCurrentUser: false,
    weeklyProgress: 78,
    improvement: 6,
    meditationStreak: 4,
    breathingStreak: 3,
    yogaStreak: 5,
    sleepStreak: 14,
    thermotherapyStreak: 1,
    dominantRecoveryType: "sleep"
  },
  {
    id: "5",
    nickname: "Fire Therapy King 🔥",
    avatar: "🔥",
    totalSessions: 98,
    longestStreak: 16,
    currentStreak: 9,
    score: 82,
    rank: 5,
    isCurrentUser: false,
    weeklyProgress: 72,
    improvement: 10,
    meditationStreak: 3,
    breathingStreak: 4,
    yogaStreak: 2,
    sleepStreak: 6,
    thermotherapyStreak: 9,
    dominantRecoveryType: "thermotherapy"
  },
  {
    id: "6", 
    nickname: "Balance Warrior 🌿",
    avatar: "🌿",
    totalSessions: 87,
    longestStreak: 18,
    currentStreak: 7,
    score: 78,
    rank: 6,
    isCurrentUser: false,
    weeklyProgress: 68,
    improvement: 3,
    meditationStreak: 7,
    breathingStreak: 5,
    yogaStreak: 6,
    sleepStreak: 4,
    thermotherapyStreak: 2,
    dominantRecoveryType: "meditation"
  },
  {
    id: "7",
    nickname: "Mindful Maya 🌺",
    avatar: "🌺",
    totalSessions: 76,
    longestStreak: 12,
    currentStreak: 5,
    score: 75,
    rank: 7,
    isCurrentUser: false,
    weeklyProgress: 65,
    improvement: -2,
    meditationStreak: 5,
    breathingStreak: 8,
    yogaStreak: 4,
    sleepStreak: 3,
    thermotherapyStreak: 1,
    dominantRecoveryType: "breathing"
  },
  {
    id: "8",
    nickname: "Calm Ocean 🌊",
    avatar: "🌊",
    totalSessions: 64,
    longestStreak: 14,
    currentStreak: 8,
    score: 71,
    rank: 8,
    isCurrentUser: false,
    weeklyProgress: 61,
    improvement: 5,
    meditationStreak: 8,
    breathingStreak: 3,
    yogaStreak: 7,
    sleepStreak: 2,
    thermotherapyStreak: 0,
    dominantRecoveryType: "yoga"
  }
];

export const useRecoveryLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<RecoveryLeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecoveryLeaderboard = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // For now, return mock data for testing
      // TODO: Switch back to real data fetching once UI is validated
      setLeaderboard(mockRecoveryLeaderboard);
      
      /* ORIGINAL REAL DATA FETCHING CODE - COMMENTED OUT FOR TESTING
      // Get user profiles with recovery streak data
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name
        `);

      if (profilesError) throw profilesError;

      // Get all recovery streak data
      const [meditationStreaks, breathingStreaks, yogaStreaks, sleepStreaks, thermotherapyStreaks] = await Promise.all([
        supabase.from('meditation_streaks').select('user_id, current_streak, total_sessions'),
        supabase.from('breathing_streaks').select('user_id, current_streak, total_sessions'), 
        supabase.from('yoga_streaks').select('user_id, current_streak, total_sessions'),
        supabase.from('sleep_streaks').select('user_id, current_streak, total_sessions'),
        supabase.from('thermotherapy_streaks').select('user_id, current_streak, total_sessions')
      ]);

      // ... rest of real data processing logic
      */
      
    } catch (error) {
      console.error('Error fetching recovery leaderboard:', error);
      // Still set mock data on error for testing
      setLeaderboard(mockRecoveryLeaderboard);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecoveryLeaderboard();
  }, [user]);

  return {
    leaderboard,
    loading,
    refreshLeaderboard: fetchRecoveryLeaderboard
  };
};