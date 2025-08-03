import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

// Debug toggle - set to false to disable logging
const DEBUG = false;

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
  // Real user data fields
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
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
  const [loadingTimeoutReached, setLoadingTimeoutReached] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const fetchInProgress = useRef(false);

  // 10-second loading timeout
  useEffect(() => {
    const timeout = setTimeout(() => setLoadingTimeoutReached(true), 10000);
    return () => clearTimeout(timeout);
  }, [refreshKey]);

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

  const getDisplayName = (userProfile: any, fallbackEmoji = '🌟'): string => {
    if (DEBUG) {
      console.debug('🔍 Hook getDisplayName: Raw data received:', {
        user_id: userProfile.user_id,
        first_name: `"${userProfile.first_name || 'undefined'}"`,
        last_name: `"${userProfile.last_name || 'undefined'}"`,
        nickname: `"${userProfile.nickname || 'undefined'}"`,
        email: `"${userProfile.email || 'undefined'}"`
      });
    }

    // Treat empty strings as null - this is the key fix
    const cleanFirstName = userProfile.first_name && userProfile.first_name.trim() !== '' && userProfile.first_name !== 'null' ? userProfile.first_name.trim() : null;
    const cleanLastName = userProfile.last_name && userProfile.last_name.trim() !== '' && userProfile.last_name !== 'null' ? userProfile.last_name.trim() : null;
    const cleanNickname = userProfile.nickname && userProfile.nickname.trim() !== '' && userProfile.nickname !== 'null' ? userProfile.nickname.trim() : null;
    const cleanEmail = userProfile.email && userProfile.email.trim() !== '' && userProfile.email !== 'null' ? userProfile.email.trim() : null;

    if (DEBUG) {
      console.debug('🧹 Hook getDisplayName: Cleaned data:', {
        cleanFirstName: `"${cleanFirstName || 'null'}"`,
        cleanLastName: `"${cleanLastName || 'null'}"`,
        cleanNickname: `"${cleanNickname || 'null'}"`,
        cleanEmail: `"${cleanEmail || 'null'}"`
      });
    }

    // PRIORITY 1: Try first_name + last_name combination
    if (cleanFirstName && cleanLastName) {
      const fullName = `${cleanFirstName} ${cleanLastName}`;
      console.debug(`✅ Hook getDisplayName: Using fullName "${fullName}" for user ${userProfile.user_id}`);
      return fullName;
    }
    
    // PRIORITY 2: Try first_name only if available
    if (cleanFirstName) {
      console.debug(`✅ Hook getDisplayName: Using first_name "${cleanFirstName}" for user ${userProfile.user_id}`);
      return cleanFirstName;
    }
    
    // PRIORITY 3: Try nickname/username as last resort before email
    if (cleanNickname && cleanNickname !== 'User') {
      console.debug(`✅ Hook getDisplayName: Using nickname "${cleanNickname}" for user ${userProfile.user_id}`);
      return cleanNickname;
    }
    
    // PRIORITY 4: Email prefix only if absolutely no name data exists
    if (cleanEmail) {
      const emailPrefix = cleanEmail.split('@')[0];
      if (emailPrefix && emailPrefix !== 'undefined') {
        console.debug(`⚠️ Hook getDisplayName: Using email prefix "${emailPrefix}" for user ${userProfile.user_id}`);
        return emailPrefix;
      }
    }
    
    // Ultimate fallback
    console.debug(`❌ Hook getDisplayName: Using "User" fallback for user ${userProfile.user_id}`);
    return 'User';
  };

  const fetchNutritionLeaderboard = async (): Promise<LeaderboardUser[]> => {
    // Get all users with their profiles and nutrition data - include email from auth.users
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        avatar_url,
        current_nutrition_streak,
        created_at
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    // Get user emails - for current user only (others will use names if available)
    const usersWithEmails = users.map((userProfile) => {
      // For current user, get email from auth context
      if (userProfile.user_id === user?.id && user?.email) {
        return { ...userProfile, email: user.email };
      }
      // For other users, we'll rely on first_name/last_name display
      return userProfile;
    });

    // Calculate scores based on nutrition logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardUsers: LeaderboardUser[] = [];

    for (const userProfile of usersWithEmails) {

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

      const groupId = calculateUserGroup(userProfile.user_id, usersWithEmails);

      leaderboardUsers.push({
        id: userProfile.user_id,
        nickname: getDisplayName(userProfile, '🌟'),
        avatar: '🌟', // This will be overridden by the avatar_url
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
        group_id: groupId,
        // Add real user data
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        email: 'email' in userProfile ? userProfile.email : undefined,
        avatar_url: userProfile.avatar_url
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
        last_name,
        avatar_url,
        created_at
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    // Get user emails - for current user only (others will use names if available)
    const usersWithEmails = users.map((userProfile) => {
      // For current user, get email from auth context
      if (userProfile.user_id === user?.id && user?.email) {
        return { ...userProfile, email: user.email };
      }
      // For other users, we'll rely on first_name/last_name display
      return userProfile;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardUsers: LeaderboardUser[] = [];

    for (const userProfile of usersWithEmails) {
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

      const groupId = calculateUserGroup(userProfile.user_id, usersWithEmails);

      leaderboardUsers.push({
        id: userProfile.user_id,
        nickname: getDisplayName(userProfile, '💪'),
        avatar: '💪', // This will be overridden by the avatar_url
        score: Math.round(averageScore),
        streak: currentStreak,
        rank: 0,
        isCurrentUser: userProfile.user_id === user?.id,
        mealsLoggedThisWeek: workoutLogs?.filter(log => {
          const logDate = new Date(log.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        }).length || 0,
        totalMealsThisWeek: 7, // 7 days per week for workouts
        weeklyProgress: 0, // Will be calculated
        dailyStreak: currentStreak,
        weeklyStreak: Math.floor(currentStreak / 7),
        group_id: groupId,
        // Add real user data
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        email: 'email' in userProfile ? userProfile.email : undefined,
        avatar_url: userProfile.avatar_url
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

  const fetchRecoveryLeaderboard = async (): Promise<LeaderboardUser[]> => {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        avatar_url,
        created_at
      `)
      .not('user_id', 'is', null);

    if (error) throw error;

    // Get user emails - for current user only (others will use names if available)
    const usersWithEmails = users.map((userProfile) => {
      // For current user, get email from auth context
      if (userProfile.user_id === user?.id && user?.email) {
        return { ...userProfile, email: user.email };
      }
      // For other users, we'll rely on first_name/last_name display
      return userProfile;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardUsers: LeaderboardUser[] = [];

    for (const userProfile of usersWithEmails) {
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

      const groupId = calculateUserGroup(userProfile.user_id, usersWithEmails);

      leaderboardUsers.push({
        id: userProfile.user_id,
        nickname: getDisplayName(userProfile, '🧘'),
        avatar: '🧘', // This will be overridden by the avatar_url
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
        group_id: groupId,
        // Add real user data
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        email: 'email' in userProfile ? userProfile.email : undefined,
        avatar_url: userProfile.avatar_url
      });
    }

    return leaderboardUsers;
  };

  const fetchLeaderboard = useCallback(async () => {
    if (fetchInProgress.current || !user) return;
    
    fetchInProgress.current = true;
    try {
      setIsLoading(true);
      setLoadingTimeoutReached(false);
      
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

      if (DEBUG) {
        console.debug('🔍 useGameChallengeLeaderboard: Raw leaderboard data:', {
          category,
          userCount: allUsers.length,
          rawUsers: allUsers.slice(0, 3).map(u => ({ id: u.id, nickname: u.nickname, score: u.score }))
        });
      }

      if (!user) {
        console.warn('❌ useGameChallengeLeaderboard: No user found, returning empty leaderboard');
        setLeaderboard({
          currentUserGroup: [],
          currentUserRank: null,
          totalUsers: 0,
          isEmpty: true
        });
        return;
      }

      console.debug('🔍 useGameChallengeLeaderboard: Processing leaderboard data:', {
        category,
        userCount: allUsers.length,
        user: user.id,
        sampleUser: allUsers[0] || null
      });

      // Filter out invalid users and add safety checks
      const validUsers = allUsers.filter(u => {
        const isValid = u && u.id && u.nickname;
        if (!isValid) {
          console.warn('⚠️ Filtering out invalid user:', u);
        }
        return isValid;
      });

      if (validUsers.length === 0) {
        console.warn('⚠️ useGameChallengeLeaderboard: No valid users found');
        setLeaderboard({
          currentUserGroup: [],
          currentUserRank: null,
          totalUsers: 0,
          isEmpty: true
        });
        return;
      }

      // Sort all users by score
      const sortedUsers = validUsers.sort((a, b) => (b.score || 0) - (a.score || 0));
      
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
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((user, index) => ({ ...user, rank: index + 1 }));

      const currentUserRank = currentUser?.rank || null;

      console.debug('✅ useGameChallengeLeaderboard: Leaderboard processed successfully:', {
        category,
        totalUsers: sortedUsers.length,
        currentUserGroupSize: currentUserGroup.length,
        currentUserRank,
        isEmpty: sortedUsers.length === 0,
        firstGroupUser: currentUserGroup[0] || null
      });

      setLeaderboard({
        currentUserGroup,
        currentUserRank,
        totalUsers: sortedUsers.length,
        isEmpty: sortedUsers.length === 0
      });

    } catch (error) {
      console.error('❌ useGameChallengeLeaderboard: Error fetching leaderboard:', error);
      setLeaderboard({
        currentUserGroup: [],
        currentUserRank: null,
        totalUsers: 0,
        isEmpty: true
      });
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [category, user?.id]); // Stable dependencies

  // Force refresh function that invalidates cache
  const forceRefresh = useCallback(async () => {
    if (DEBUG) console.log('🔄 Force refreshing leaderboard - invalidating cache...');
    setLeaderboard({
      currentUserGroup: [],
      currentUserRank: null,
      totalUsers: 0,
      isEmpty: true
    });
    setRefreshKey(prev => prev + 1);
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, refreshKey]); // Only depend on stable callback

  return {
    leaderboard: loadingTimeoutReached && isLoading ? {
      currentUserGroup: [],
      currentUserRank: null,
      totalUsers: 0,
      isEmpty: true
    } : leaderboard,
    isLoading: loadingTimeoutReached ? false : isLoading,
    refresh: forceRefresh,
    hasTimedOut: loadingTimeoutReached
  };
};