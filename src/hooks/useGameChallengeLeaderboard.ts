import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface LeaderboardUser {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  rank: number;
  isCurrentUser: boolean;
  consistency?: number;
  improvement?: number;
  mealsLoggedThisWeek?: number;
  totalMealsThisWeek?: number;
  weeklyProgress?: number;
  dailyStreak?: number;
  weeklyStreak?: number;
  group_id: number;
}

export interface GroupedLeaderboard {
  currentUserGroup: LeaderboardUser[];
  currentUserRank: number | null;
  totalUsers: number;
  isEmpty: boolean;
}

export const useGameChallengeLeaderboard = (category: 'nutrition' | 'exercise' | 'recovery') => {
  const [leaderboard, setLeaderboard] = useState<GroupedLeaderboard>({
    currentUserGroup: [],
    currentUserRank: null,
    totalUsers: 0,
    isEmpty: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const calculateUserGroup = (userId: string, allUsers: any[]): number => {
    // Sort users by created_at to ensure consistent grouping
    const sortedUsers = [...allUsers].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const userIndex = sortedUsers.findIndex(u => u.user_id === userId);
    if (userIndex === -1) return 1;
    
    // Group users into clusters of 20 (1-20, 21-40, etc.)
    return Math.floor(userIndex / 20) + 1;
  };

  const fetchNutritionLeaderboard = async (): Promise<LeaderboardUser[]> => {
    // Get all users with their profiles and nutrition data
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        first_name,
        current_nutrition_streak,
        created_at
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    // Calculate scores based on nutrition logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardUsers: LeaderboardUser[] = [];

    for (const userProfile of users) {
      const { data: nutritionLogs } = await supabase
        .from('nutrition_logs')
        .select('created_at, quality_score')
        .eq('user_id', userProfile.user_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalScore = nutritionLogs?.reduce((sum, log) => sum + (log.quality_score || 50), 0) || 0;
      const averageScore = nutritionLogs?.length ? totalScore / nutritionLogs.length : 0;
      
      // Calculate consistency (days with logs out of 30)
      const uniqueDays = new Set(
        nutritionLogs?.map(log => log.created_at.split('T')[0]) || []
      );
      const consistency = (uniqueDays.size / 30) * 100;

      const groupId = calculateUserGroup(userProfile.user_id, users);

      leaderboardUsers.push({
        id: userProfile.user_id,
        nickname: `${userProfile.first_name || 'User'} 🌟`,
        avatar: '🌟',
        score: Math.round(averageScore),
        streak: userProfile.current_nutrition_streak || 0,
        rank: 0, // Will be set after sorting
        isCurrentUser: userProfile.user_id === user?.id,
        consistency: Math.round(consistency),
        improvement: 0, // Could be calculated by comparing to previous period
        mealsLoggedThisWeek: nutritionLogs?.filter(log => {
          const logDate = new Date(log.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }).length || 0,
        totalMealsThisWeek: 21, // Assuming 3 meals per day for 7 days
        weeklyProgress: 0, // Will be calculated
        dailyStreak: userProfile.current_nutrition_streak || 0,
        weeklyStreak: Math.floor((userProfile.current_nutrition_streak || 0) / 7),
        group_id: groupId
      });
    }

    // Calculate weekly progress for each user
    leaderboardUsers.forEach(user => {
      user.weeklyProgress = user.totalMealsThisWeek > 0 
        ? Math.round((user.mealsLoggedThisWeek! / user.totalMealsThisWeek!) * 100)
        : 0;
    });

    return leaderboardUsers;
  };

  const fetchExerciseLeaderboard = async (): Promise<LeaderboardUser[]> => {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        first_name,
        created_at
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardUsers: LeaderboardUser[] = [];

    for (const userProfile of users) {
      const { data: workoutLogs } = await supabase
        .from('workout_completions')
        .select('created_at, duration_minutes')
        .eq('user_id', userProfile.user_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate score based on duration and frequency
      const totalDuration = workoutLogs?.reduce((sum, log) => sum + (log.duration_minutes || 30), 0) || 0;
      const averageScore = workoutLogs?.length ? (totalDuration / workoutLogs.length) + (workoutLogs.length * 10) : 0;
      
      // Calculate workout streak
      const workoutDates = workoutLogs?.map(log => log.created_at.split('T')[0]).sort() || [];
      let currentStreak = 0;
      if (workoutDates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        let checkDate = new Date();
        
        while (checkDate >= thirtyDaysAgo) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (workoutDates.includes(dateStr)) {
            currentStreak++;
          } else if (currentStreak > 0) {
            break;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      const groupId = calculateUserGroup(userProfile.user_id, users);

      leaderboardUsers.push({
        id: userProfile.user_id,
        nickname: `${userProfile.first_name || 'User'} 💪`,
        avatar: '💪',
        score: Math.round(averageScore),
        streak: currentStreak,
        rank: 0,
        isCurrentUser: userProfile.user_id === user?.id,
        consistency: workoutDates.length > 0 ? (workoutDates.length / 30) * 100 : 0,
        improvement: 0,
        mealsLoggedThisWeek: workoutLogs?.filter(log => {
          const logDate = new Date(log.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }).length || 0,
        totalMealsThisWeek: 7, // 7 workout days
        weeklyProgress: 0,
        dailyStreak: currentStreak,
        weeklyStreak: Math.floor(currentStreak / 7),
        group_id: groupId
      });
    }

    return leaderboardUsers;
  };

  const fetchRecoveryLeaderboard = async (): Promise<LeaderboardUser[]> => {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        first_name,
        created_at
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardUsers: LeaderboardUser[] = [];

    for (const userProfile of users) {
      const { data: recoveryLogs } = await supabase
        .from('recovery_session_logs')
        .select('created_at, duration_minutes, category')
        .eq('user_id', userProfile.user_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Calculate recovery score based on sessions and variety
      const sessionsByCategory = recoveryLogs?.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalSessions = recoveryLogs?.length || 0;
      const categoryCount = Object.keys(sessionsByCategory).length;
      const varietyBonus = categoryCount * 10; // Bonus for trying different recovery types
      const averageScore = totalSessions > 0 ? (totalSessions * 20) + varietyBonus : 0;

      // Calculate recovery streak
      const recoveryDates = recoveryLogs?.map(log => log.created_at.split('T')[0]).sort() || [];
      let currentStreak = 0;
      if (recoveryDates.length > 0) {
        let checkDate = new Date();
        
        while (checkDate >= thirtyDaysAgo) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (recoveryDates.includes(dateStr)) {
            currentStreak++;
          } else if (currentStreak > 0) {
            break;
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      const groupId = calculateUserGroup(userProfile.user_id, users);

      leaderboardUsers.push({
        id: userProfile.user_id,
        nickname: `${userProfile.first_name || 'User'} 🧘`,
        avatar: '🧘',
        score: Math.round(averageScore),
        streak: currentStreak,
        rank: 0,
        isCurrentUser: userProfile.user_id === user?.id,
        consistency: recoveryDates.length > 0 ? (recoveryDates.length / 30) * 100 : 0,
        improvement: 0,
        mealsLoggedThisWeek: recoveryLogs?.filter(log => {
          const logDate = new Date(log.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }).length || 0,
        totalMealsThisWeek: 7,
        weeklyProgress: 0,
        dailyStreak: currentStreak,
        weeklyStreak: Math.floor(currentStreak / 7),
        group_id: groupId
      });
    }

    return leaderboardUsers;
  };

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      
      let allUsers: LeaderboardUser[] = [];
      
      switch (category) {
        case 'nutrition':
          allUsers = await fetchNutritionLeaderboard();
          break;
        case 'exercise':
          allUsers = await fetchExerciseLeaderboard();
          break;
        case 'recovery':
          allUsers = await fetchRecoveryLeaderboard();
          break;
        default:
          allUsers = [];
      }

      if (!user) {
        setLeaderboard({
          currentUserGroup: [],
          currentUserRank: null,
          totalUsers: 0,
          isEmpty: true
        });
        return;
      }

      // Sort all users by score
      const sortedUsers = allUsers.sort((a, b) => b.score - a.score);
      
      // Assign global ranks
      sortedUsers.forEach((user, index) => {
        user.rank = index + 1;
      });

      // Find current user's group
      const currentUser = sortedUsers.find(u => u.id === user.id);
      const currentUserGroupId = currentUser?.group_id || 1;

      // Get users in the same group as current user
      const currentUserGroup = sortedUsers
        .filter(u => u.group_id === currentUserGroupId)
        .sort((a, b) => b.score - a.score)
        .map((user, index) => ({ ...user, rank: index + 1 }));

      const currentUserRank = currentUser?.rank || null;

      setLeaderboard({
        currentUserGroup,
        currentUserRank,
        totalUsers: sortedUsers.length,
        isEmpty: sortedUsers.length === 0
      });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard({
        currentUserGroup: [],
        currentUserRank: null,
        totalUsers: 0,
        isEmpty: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category, user?.id]);

  return {
    leaderboard,
    isLoading,
    refresh: fetchLeaderboard
  };
};