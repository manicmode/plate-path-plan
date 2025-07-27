import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SleepNudge {
  id: string;
  user_id: string;
  nudge_type: string;
  nudge_reason: string;
  nudge_message: string;
  user_action: string;
  delivered_at: string;
  created_at: string;
  updated_at: string;
}

interface UseSleepNudgeDisplayOptions {
  showOnlyRecent?: boolean;
  maxEntries?: number;
}

export const useSleepNudgeDisplay = (options: UseSleepNudgeDisplayOptions = {}) => {
  const { showOnlyRecent = false, maxEntries = 5 } = options;
  const [visibleNudges, setVisibleNudges] = useState<SleepNudge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNudges = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          setVisibleNudges([]);
          setIsLoading(false);
          return;
        }

        let query = supabase
          .from('sleep_nudges')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('user_action', 'pending')
          .order('created_at', { ascending: false });

        if (showOnlyRecent) {
          const twentyFourHoursAgo = new Date();
          twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
          query = query.gte('created_at', twentyFourHoursAgo.toISOString());
        }

        if (maxEntries) {
          query = query.limit(maxEntries);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error loading sleep nudges:', error);
          return;
        }

        setVisibleNudges(data || []);
      } catch (error) {
        console.error('Error in loadNudges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNudges();

    const channel = supabase
      .channel('sleep-nudges-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sleep_nudges'
      }, (payload) => {
        console.log('Sleep nudge change detected:', payload);
        loadNudges();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showOnlyRecent, maxEntries]);

  const handleDismissNudge = async (nudgeId: string) => {
    try {
      const { error } = await supabase
        .from('sleep_nudges')
        .update({ user_action: 'dismissed' })
        .eq('id', nudgeId);

      if (error) {
        console.error('Error dismissing sleep nudge:', error);
        return;
      }

      setVisibleNudges(prev => prev.filter(nudge => nudge.id !== nudgeId));
    } catch (error) {
      console.error('Error in handleDismissNudge:', error);
    }
  };

  const handleAcceptNudge = async (nudgeId: string) => {
    try {
      const { error } = await supabase
        .from('sleep_nudges')
        .update({ user_action: 'accepted' })
        .eq('id', nudgeId);

      if (error) {
        console.error('Error accepting sleep nudge:', error);
        return;
      }

      setVisibleNudges(prev => prev.filter(nudge => nudge.id !== nudgeId));
    } catch (error) {
      console.error('Error in handleAcceptNudge:', error);
    }
  };

  const handleIgnoreNudge = async (nudgeId: string) => {
    try {
      const { error } = await supabase
        .from('sleep_nudges')
        .update({ user_action: 'ignored' })
        .eq('id', nudgeId);

      if (error) {
        console.error('Error ignoring sleep nudge:', error);
        return;
      }

      setVisibleNudges(prev => prev.filter(nudge => nudge.id !== nudgeId));
    } catch (error) {
      console.error('Error in handleIgnoreNudge:', error);
    }
  };

  return {
    visibleNudges,
    isLoading,
    handleDismissNudge,
    handleAcceptNudge,
    handleIgnoreNudge,
  };
};