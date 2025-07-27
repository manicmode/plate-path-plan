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
}

export const useRecoveryLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<RecoveryLeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecoveryLeaderboard = async () => {
    if (!user) return;

    try {
      setLoading(true);

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

      // Combine all streak data by user
      const userRecoveryData = new Map();

      profiles?.forEach(profile => {
        if (!profile.user_id) return;
        
        const meditation = meditationStreaks.data?.find(s => s.user_id === profile.user_id) || { current_streak: 0, total_sessions: 0 };
        const breathing = breathingStreaks.data?.find(s => s.user_id === profile.user_id) || { current_streak: 0, total_sessions: 0 };
        const yoga = yogaStreaks.data?.find(s => s.user_id === profile.user_id) || { current_streak: 0, total_sessions: 0 };
        const sleep = sleepStreaks.data?.find(s => s.user_id === profile.user_id) || { current_streak: 0, total_sessions: 0 };
        const thermotherapy = thermotherapyStreaks.data?.find(s => s.user_id === profile.user_id) || { current_streak: 0, total_sessions: 0 };

        const totalSessions = meditation.total_sessions + breathing.total_sessions + yoga.total_sessions + sleep.total_sessions + thermotherapy.total_sessions;
        const allStreaks = [meditation.current_streak, breathing.current_streak, yoga.current_streak, sleep.current_streak, thermotherapy.current_streak];
        const currentStreak = Math.max(...allStreaks, 0);
        const longestStreak = currentStreak; // For now, using current as longest
        
        // Calculate score based on sessions and streaks
        const score = totalSessions * 2 + currentStreak * 5;

        // Generate recovery-themed avatars
        const recoveryAvatars = ['🧘‍♂️', '🧘‍♀️', '🌿', '🕯️', '🌸', '💆‍♂️', '💆‍♀️', '🧘', '🌺', '🌻', '🦋', '🍃'];
        const avatar = recoveryAvatars[Math.floor(Math.random() * recoveryAvatars.length)];

        userRecoveryData.set(profile.user_id, {
          id: profile.user_id,
          nickname: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : `Recovery Warrior`,
          avatar,
          totalSessions,
          longestStreak,
          currentStreak,
          score,
          isCurrentUser: profile.user_id === user.id,
          weeklyProgress: Math.min(100, Math.round((totalSessions / 7) * 100)), // Estimated weekly progress
          improvement: Math.floor(Math.random() * 20) - 5, // Mock improvement for now
          meditationStreak: meditation.current_streak,
          breathingStreak: breathing.current_streak,
          yogaStreak: yoga.current_streak,
          sleepStreak: sleep.current_streak,
          thermotherapyStreak: thermotherapy.current_streak,
        });
      });

      // Convert to array and sort by score
      const sortedUsers = Array.from(userRecoveryData.values())
        .filter(user => user.totalSessions > 0) // Only include users with recovery activity
        .sort((a, b) => b.score - a.score)
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }));

      setLeaderboard(sortedUsers);
    } catch (error) {
      console.error('Error fetching recovery leaderboard:', error);
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