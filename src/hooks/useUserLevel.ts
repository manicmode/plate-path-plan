import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface UserLevel {
  level: number;
  current_xp: number;
  xp_to_next_level: number;
  last_leveled_up_at: string | null;
}

interface LevelUpData {
  newLevel: number;
  xpToNext: number;
  isLevelUp: boolean;
}

export const useUserLevel = () => {
  const { user } = useAuth();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the last seen level to detect level-ups
  const getLastSeenLevel = () => {
    if (!user?.id) return 0;
    const stored = localStorage.getItem(`lastSeenLevel_${user.id}`);
    return stored ? parseInt(stored, 10) : 0;
  };

  const setLastSeenLevel = (level: number) => {
    if (!user?.id) return;
    localStorage.setItem(`lastSeenLevel_${user.id}`, level.toString());
  };

  const fetchUserLevel = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching user level:', error);
        return;
      }

      const currentLevel = data || {
        level: 1,
        current_xp: 0,
        xp_to_next_level: 100,
        last_leveled_up_at: null
      };

      setUserLevel(currentLevel);

      // Check for level-up
      const lastSeenLevel = getLastSeenLevel();
      if (currentLevel.level > lastSeenLevel && lastSeenLevel > 0) {
        setLevelUpData({
          newLevel: currentLevel.level,
          xpToNext: currentLevel.xp_to_next_level,
          isLevelUp: true
        });
      }

      // Update last seen level
      setLastSeenLevel(currentLevel.level);
    } catch (error) {
      console.error('Error in fetchUserLevel:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLevel = async () => {
    await fetchUserLevel();
  };

  const clearLevelUp = () => {
    setLevelUpData(null);
  };

  useEffect(() => {
    fetchUserLevel();
  }, [user?.id]);

  // Set up real-time subscription for level changes
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('user_levels_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_levels',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newLevel = payload.new as UserLevel;
          const lastSeenLevel = getLastSeenLevel();
          
          // Check if this is a genuine level-up
          if (newLevel.level > lastSeenLevel) {
            setLevelUpData({
              newLevel: newLevel.level,
              xpToNext: newLevel.xp_to_next_level,
              isLevelUp: true
            });
            setLastSeenLevel(newLevel.level);
          }
          
          setUserLevel(newLevel);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  return {
    userLevel,
    levelUpData,
    loading,
    refreshLevel,
    clearLevelUp
  };
};