
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Badge {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  requirement_duration?: number;
  tracker_type?: string;
  rarity: 'common' | 'rare' | 'legendary';
  is_active: boolean;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  created_at: string;
  badge?: Badge;
}

export interface UserStreaks {
  current_nutrition_streak: number;
  current_hydration_streak: number;
  current_supplement_streak: number;
  longest_nutrition_streak: number;
  longest_hydration_streak: number;
  longest_supplement_streak: number;
  selected_badge_title?: string;
  total_badges_earned: number;
}

interface BadgeContextType {
  badges: Badge[];
  userBadges: UserBadge[];
  userStreaks: UserStreaks | null;
  loading: boolean;
  checkForNewBadges: () => Promise<void>;
  selectBadgeTitle: (title: string) => Promise<void>;
  getBadgeProgress: (badge: Badge) => number;
  refreshUserData: () => Promise<void>;
  awardBadgeManually: (badgeId: string) => Promise<boolean>;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export const useBadges = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
};

interface BadgeProviderProps {
  children: ReactNode;
}

export const BadgeProvider: React.FC<BadgeProviderProps> = ({ children }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userStreaks, setUserStreaks] = useState<UserStreaks | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all available badges
  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('rarity', { ascending: false })
        .order('requirement_value', { ascending: true });

      if (error) throw error;
      setBadges((data || []).map(badge => ({
        ...badge,
        rarity: badge.rarity as 'common' | 'rare' | 'legendary'
      })));
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  // Fetch user's unlocked badges
  const fetchUserBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setUserBadges((data || []).map(ub => ({
        ...ub,
        badge: ub.badge ? {
          ...ub.badge,
          rarity: ub.badge.rarity as 'common' | 'rare' | 'legendary'
        } : undefined
      })));
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };

  // Fetch user's streak data
  const fetchUserStreaks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          current_nutrition_streak,
          current_hydration_streak,
          current_supplement_streak,
          longest_nutrition_streak,
          longest_hydration_streak,
          longest_supplement_streak,
          selected_badge_title,
          total_badges_earned
        `)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserStreaks(data || {
        current_nutrition_streak: 0,
        current_hydration_streak: 0,
        current_supplement_streak: 0,
        longest_nutrition_streak: 0,
        longest_hydration_streak: 0,
        longest_supplement_streak: 0,
        total_badges_earned: 0,
      });
    } catch (error) {
      console.error('Error fetching user streaks:', error);
    }
  };

  // Check if user qualifies for new badges using the server function
  const checkForNewBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the database function to check and award badges
      const { data, error } = await supabase.rpc('check_and_award_all_badges', {
        target_user_id: user.id
      });

      if (error) {
        console.error('Error checking badges:', error);
        return;
      }

      const badgesAwarded = data || 0;
      
      if (badgesAwarded > 0) {
        toast({
          title: "🎉 New Badges Unlocked!",
          description: `You've earned ${badgesAwarded} new badge${badgesAwarded > 1 ? 's' : ''}!`,
        });

        // Refresh user data
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error checking for new badges:', error);
    }
  };

  // Award badge manually (for testing)
  const awardBadgeManually = async (badgeId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
        });

      if (error) {
        console.error('Error awarding badge:', error);
        return false;
      }

      toast({
        title: "🎉 Badge Awarded!",
        description: "Badge has been manually awarded for testing.",
      });

      await refreshUserData();
      return true;
    } catch (error) {
      console.error('Error awarding badge manually:', error);
      return false;
    }
  };

  // Select a badge title to display
  const selectBadgeTitle = async (title: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ selected_badge_title: title })
        .eq('user_id', user.id);

      if (error) throw error;
      
      setUserStreaks(prev => prev ? { ...prev, selected_badge_title: title } : null);
      
      toast({
        title: "Title Updated!",
        description: `Your title is now "${title}"`,
      });
    } catch (error) {
      console.error('Error updating badge title:', error);
    }
  };

  // Calculate badge progress
  const getBadgeProgress = (badge: Badge): number => {
    if (!userStreaks) return 0;

    switch (badge.requirement_type) {
      case 'streak':
        if (badge.tracker_type === 'hydration') {
          return Math.min(100, (userStreaks.current_hydration_streak / badge.requirement_value) * 100);
        } else if (badge.tracker_type === 'nutrition') {
          return Math.min(100, (userStreaks.current_nutrition_streak / badge.requirement_value) * 100);
        } else if (badge.tracker_type === 'supplements') {
          return Math.min(100, (userStreaks.current_supplement_streak / badge.requirement_value) * 100);
        } else if (badge.tracker_type === 'any') {
          const maxStreak = Math.max(
            userStreaks.current_nutrition_streak,
            userStreaks.current_hydration_streak,
            userStreaks.current_supplement_streak
          );
          return Math.min(100, (maxStreak / badge.requirement_value) * 100);
        }
        break;
      
      default:
        return 0;
    }

    return 0;
  };

  // Refresh all user data
  const refreshUserData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUserBadges(),
      fetchUserStreaks(),
    ]);
    setLoading(false);
  };

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBadges(),
        fetchUserBadges(),
        fetchUserStreaks(),
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  // Check for new badges when user streaks update (but not too frequently)
  useEffect(() => {
    if (!loading && userStreaks && badges.length > 0) {
      // Only check if user has any active streaks
      const hasActiveStreaks = userStreaks.current_nutrition_streak > 0 || 
                              userStreaks.current_hydration_streak > 0 || 
                              userStreaks.current_supplement_streak > 0;
      
      if (hasActiveStreaks) {
        // Use a timeout to avoid rapid-fire badge checks
        const timeoutId = setTimeout(() => {
          checkForNewBadges();
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [userStreaks?.current_nutrition_streak, userStreaks?.current_hydration_streak, userStreaks?.current_supplement_streak, loading, badges.length]);

  const value: BadgeContextType = {
    badges,
    userBadges,
    userStreaks,
    loading,
    checkForNewBadges,
    selectBadgeTitle,
    getBadgeProgress,
    refreshUserData,
    awardBadgeManually,
  };

  return (
    <BadgeContext.Provider value={value}>
      {children}
    </BadgeContext.Provider>
  );
};
