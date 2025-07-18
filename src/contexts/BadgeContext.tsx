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

  // Check if user qualifies for new badges
  const checkForNewBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userStreaks) return;

      const unlockedBadgeIds = userBadges.map(ub => ub.badge_id);
      const newlyUnlockedBadges: Badge[] = [];

      for (const badge of badges) {
        if (unlockedBadgeIds.includes(badge.id)) continue;

        const progress = getBadgeProgress(badge);
        if (progress >= 100) {
          // User qualifies for this badge
          const { error } = await supabase
            .from('user_badges')
            .insert({
              user_id: user.id,
              badge_id: badge.id,
            });

          if (!error) {
            newlyUnlockedBadges.push(badge);
            
            // Show unlock notification
            toast({
              title: "🎉 New Badge Unlocked!",
              description: `You've earned "${badge.title}"!`,
            });
          }
        }
      }

      if (newlyUnlockedBadges.length > 0) {
        // Update total badges count
        await supabase
          .from('user_profiles')
          .update({
            total_badges_earned: userBadges.length + newlyUnlockedBadges.length
          })
          .eq('user_id', user.id);

        // Refresh user data
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error checking for new badges:', error);
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
        // For other requirement types, assume 0% progress for now
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

  // Check for new badges when user streaks update
  useEffect(() => {
    if (!loading && userStreaks && badges.length > 0) {
      checkForNewBadges();
    }
  }, [userStreaks?.current_nutrition_streak, userStreaks?.current_hydration_streak, userStreaks?.current_supplement_streak]);

  const value: BadgeContextType = {
    badges,
    userBadges,
    userStreaks,
    loading,
    checkForNewBadges,
    selectBadgeTitle,
    getBadgeProgress,
    refreshUserData,
  };

  return (
    <BadgeContext.Provider value={value}>
      {children}
    </BadgeContext.Provider>
  );
};