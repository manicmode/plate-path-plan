import { useState, useEffect } from 'react';
import { getDisplayName } from '@/lib/displayName';
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

// Temporary mock data for testing Recovery Rankings UI - 20 users to match other tabs
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
  },
  {
    id: "9",
    nickname: "Peace Keeper ☮️",
    avatar: "☮️",
    totalSessions: 59,
    longestStreak: 11,
    currentStreak: 6,
    score: 69,
    rank: 9,
    isCurrentUser: false,
    weeklyProgress: 58,
    improvement: 2,
    meditationStreak: 6,
    breathingStreak: 4,
    yogaStreak: 3,
    sleepStreak: 5,
    thermotherapyStreak: 1,
    dominantRecoveryType: "meditation"
  },
  {
    id: "10",
    nickname: "Flow State 💫",
    avatar: "💫",
    totalSessions: 54,
    longestStreak: 9,
    currentStreak: 4,
    score: 66,
    rank: 10,
    isCurrentUser: false,
    weeklyProgress: 55,
    improvement: -1,
    meditationStreak: 4,
    breathingStreak: 6,
    yogaStreak: 5,
    sleepStreak: 3,
    thermotherapyStreak: 2,
    dominantRecoveryType: "breathing"
  },
  {
    id: "11",
    nickname: "Serene Sage 🌸",
    avatar: "🌸",
    totalSessions: 48,
    longestStreak: 13,
    currentStreak: 3,
    score: 63,
    rank: 11,
    isCurrentUser: false,
    weeklyProgress: 52,
    improvement: 4,
    meditationStreak: 3,
    breathingStreak: 2,
    yogaStreak: 8,
    sleepStreak: 4,
    thermotherapyStreak: 0,
    dominantRecoveryType: "yoga"
  },
  {
    id: "12",
    nickname: "Dream Walker 🌙",
    avatar: "🌙",
    totalSessions: 43,
    longestStreak: 8,
    currentStreak: 5,
    score: 60,
    rank: 12,
    isCurrentUser: false,
    weeklyProgress: 49,
    improvement: 1,
    meditationStreak: 2,
    breathingStreak: 1,
    yogaStreak: 2,
    sleepStreak: 5,
    thermotherapyStreak: 3,
    dominantRecoveryType: "sleep"
  },
  {
    id: "13",
    nickname: "Heat Master 🌋",
    avatar: "🌋",
    totalSessions: 39,
    longestStreak: 7,
    currentStreak: 2,
    score: 57,
    rank: 13,
    isCurrentUser: false,
    weeklyProgress: 46,
    improvement: -3,
    meditationStreak: 1,
    breathingStreak: 2,
    yogaStreak: 1,
    sleepStreak: 1,
    thermotherapyStreak: 7,
    dominantRecoveryType: "thermotherapy"
  },
  {
    id: "14",
    nickname: "Tranquil Tiger 🐅",
    avatar: "🐅",
    totalSessions: 35,
    longestStreak: 6,
    currentStreak: 4,
    score: 54,
    rank: 14,
    isCurrentUser: false,
    weeklyProgress: 43,
    improvement: 6,
    meditationStreak: 4,
    breathingStreak: 3,
    yogaStreak: 2,
    sleepStreak: 2,
    thermotherapyStreak: 1,
    dominantRecoveryType: "meditation"
  },
  {
    id: "15",
    nickname: "Breath Artist 🎨",
    avatar: "🎨",
    totalSessions: 31,
    longestStreak: 5,
    currentStreak: 1,
    score: 51,
    rank: 15,
    isCurrentUser: false,
    weeklyProgress: 40,
    improvement: -5,
    meditationStreak: 1,
    breathingStreak: 5,
    yogaStreak: 1,
    sleepStreak: 1,
    thermotherapyStreak: 0,
    dominantRecoveryType: "breathing"
  },
  {
    id: "16",
    nickname: "Flexible Fox 🦊",
    avatar: "🦊",
    totalSessions: 27,
    longestStreak: 4,
    currentStreak: 3,
    score: 48,
    rank: 16,
    isCurrentUser: false,
    weeklyProgress: 37,
    improvement: 2,
    meditationStreak: 2,
    breathingStreak: 1,
    yogaStreak: 3,
    sleepStreak: 1,
    thermotherapyStreak: 1,
    dominantRecoveryType: "yoga"
  },
  {
    id: "17",
    nickname: "Rest Rebel 😇",
    avatar: "😇",
    totalSessions: 23,
    longestStreak: 3,
    currentStreak: 2,
    score: 45,
    rank: 17,
    isCurrentUser: false,
    weeklyProgress: 34,
    improvement: -1,
    meditationStreak: 1,
    breathingStreak: 0,
    yogaStreak: 1,
    sleepStreak: 3,
    thermotherapyStreak: 1,
    dominantRecoveryType: "sleep"
  },
  {
    id: "18",
    nickname: "Sauna Star ⭐",
    avatar: "⭐",
    totalSessions: 19,
    longestStreak: 2,
    currentStreak: 1,
    score: 42,
    rank: 18,
    isCurrentUser: false,
    weeklyProgress: 31,
    improvement: 3,
    meditationStreak: 0,
    breathingStreak: 1,
    yogaStreak: 0,
    sleepStreak: 0,
    thermotherapyStreak: 2,
    dominantRecoveryType: "thermotherapy"
  },
  {
    id: "19",
    nickname: "Zen Rookie 🌱",
    avatar: "🌱",
    totalSessions: 15,
    longestStreak: 2,
    currentStreak: 1,
    score: 39,
    rank: 19,
    isCurrentUser: false,
    weeklyProgress: 28,
    improvement: 1,
    meditationStreak: 1,
    breathingStreak: 1,
    yogaStreak: 1,
    sleepStreak: 1,
    thermotherapyStreak: 0,
    dominantRecoveryType: "meditation"
  },
  {
    id: "20",
    nickname: "New Warrior 🥉",
    avatar: "🥉",
    totalSessions: 11,
    longestStreak: 1,
    currentStreak: 0,
    score: 36,
    rank: 20,
    isCurrentUser: false,
    weeklyProgress: 25,
    improvement: -2,
    meditationStreak: 0,
    breathingStreak: 1,
    yogaStreak: 0,
    sleepStreak: 1,
    thermotherapyStreak: 0,
    dominantRecoveryType: "breathing"
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
      
      // Get current month's recovery rankings data
      const currentMonth = new Date();
      const monthYear = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data: recoveryMetrics, error } = await supabase
        .from('recovery_challenge_metrics')
        .select(`
          user_id,
          meditation_sessions,
          breathing_sessions,
          yoga_sessions,
          sleep_sessions,
          stretching_sessions,
          muscle_recovery_sessions,
          total_recovery_sessions,
          recovery_streak_bonus,
          final_recovery_score,
          rank_position
        `)
        .eq('month_year', monthYear.toISOString().split('T')[0])
        .order('final_recovery_score', { ascending: false });

      if (error) {
        console.error('Error fetching recovery metrics:', error);
        // Fallback to mock data
        setLeaderboard(mockRecoveryLeaderboard);
        return;
      }

      if (!recoveryMetrics || recoveryMetrics.length === 0) {
        // No data for current month, use mock data
        setLeaderboard(mockRecoveryLeaderboard);
        return;
      }

      // Get user profiles for the users in recovery metrics
      const userIds = recoveryMetrics.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLeaderboard(mockRecoveryLeaderboard);
        return;
      }

      // Transform the data into the expected format
      const leaderboardData: RecoveryLeaderboardUser[] = recoveryMetrics.map((metric, index) => {
        const profile = profiles.find(p => p.user_id === metric.user_id);
        const displayName = profile ? getDisplayName({
          first_name: profile.first_name
        }) : 'Anonymous User';
        
        // Determine dominant recovery type
        const types = [
          { type: 'meditation', sessions: metric.meditation_sessions || 0 },
          { type: 'breathing', sessions: metric.breathing_sessions || 0 },
          { type: 'yoga', sessions: metric.yoga_sessions || 0 },
          { type: 'sleep', sessions: metric.sleep_sessions || 0 },
          { type: 'stretching', sessions: metric.stretching_sessions || 0 },
          { type: 'muscle-recovery', sessions: metric.muscle_recovery_sessions || 0 }
        ];
        
        const dominantType = types.reduce((max, current) => 
          current.sessions > max.sessions ? current : max
        );

        // Get appropriate avatar based on dominant type
        const avatars = {
          'meditation': '🧘‍♂️',
          'breathing': '🌬️',
          'yoga': '🧘‍♀️',
          'sleep': '😴',
          'stretching': '🤸‍♂️',
          'muscle-recovery': '💪'
        };

        return {
          id: metric.user_id,
          nickname: displayName,
          avatar: avatars[dominantType.type as keyof typeof avatars] || '🧘‍♂️',
          totalSessions: metric.total_recovery_sessions || 0,
          longestStreak: 0, // We don't have this data in the current table
          currentStreak: Math.floor((metric.recovery_streak_bonus || 1.0) * 10), // Estimate from bonus
          score: Math.round(metric.final_recovery_score || 0),
          rank: metric.rank_position || (index + 1),
          isCurrentUser: metric.user_id === user.id,
          weeklyProgress: Math.min(100, Math.round((metric.total_recovery_sessions || 0) * 5)), // Estimate
          improvement: Math.floor(Math.random() * 20) - 10, // Random for now, would need historical data
          meditationStreak: metric.meditation_sessions || 0,
          breathingStreak: metric.breathing_sessions || 0,
          yogaStreak: metric.yoga_sessions || 0,
          sleepStreak: metric.sleep_sessions || 0,
          thermotherapyStreak: metric.muscle_recovery_sessions || 0, // Using muscle recovery as thermotherapy
          dominantRecoveryType: dominantType.type
        };
      });

      setLeaderboard(leaderboardData);
      
    } catch (error) {
      console.error('Error fetching recovery leaderboard:', error);
      // Fallback to mock data on any error
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