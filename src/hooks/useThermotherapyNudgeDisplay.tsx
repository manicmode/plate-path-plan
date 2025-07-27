import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThermotherapyNudge {
  id: string;
  user_id: string;
  nudge_type: string;
  nudge_reason: string;
  nudge_message: string;
  user_action: 'pending' | 'accepted' | 'dismissed' | 'ignored';
  delivered_at: string;
  created_at: string;
  updated_at: string;
}

interface NudgeDisplayHook {
  recentNudges: ThermotherapyNudge[];
  activeNudge: ThermotherapyNudge | null;
  loading: boolean;
  acceptNudge: (nudgeId: string) => Promise<void>;
  dismissNudge: (nudgeId: string) => Promise<void>;
  markAsIgnored: (nudgeId: string) => Promise<void>;
  refreshNudges: () => Promise<void>;
}

export function useThermotherapyNudgeDisplay(): NudgeDisplayHook {
  const [recentNudges, setRecentNudges] = useState<ThermotherapyNudge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNudges();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('thermotherapy_nudges_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thermotherapy_nudges',
        },
        (payload) => {
          console.log('Thermotherapy nudge updated:', payload);
          fetchNudges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Auto-ignore old pending nudges after 24 hours
    const autoIgnoreOldNudges = async () => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);

      const oldPendingNudges = recentNudges.filter(
        nudge => 
          nudge.user_action === 'pending' && 
          new Date(nudge.delivered_at) < cutoffTime
      );

      for (const nudge of oldPendingNudges) {
        await markAsIgnored(nudge.id);
      }
    };

    if (recentNudges.length > 0) {
      autoIgnoreOldNudges();
    }
  }, [recentNudges]);

  const fetchNudges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('thermotherapy_nudges')
        .select('*')
        .eq('user_id', user.id)
        .gte('delivered_at', sevenDaysAgo.toISOString())
        .order('delivered_at', { ascending: false });

      if (error) {
        console.error('Error fetching thermotherapy nudges:', error);
        return;
      }

      setRecentNudges((data as ThermotherapyNudge[]) || []);
    } catch (error) {
      console.error('Error fetching thermotherapy nudges:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateNudgeAction = async (nudgeId: string, action: 'accepted' | 'dismissed' | 'ignored') => {
    try {
      const { error } = await supabase
        .from('thermotherapy_nudges')
        .update({ 
          user_action: action,
          updated_at: new Date().toISOString()
        })
        .eq('id', nudgeId);

      if (error) throw error;

      // Update local state
      setRecentNudges(prev => 
        prev.map(nudge => 
          nudge.id === nudgeId 
            ? { ...nudge, user_action: action, updated_at: new Date().toISOString() }
            : nudge
        )
      );
    } catch (error) {
      console.error('Error updating nudge action:', error);
      throw error;
    }
  };

  const acceptNudge = async (nudgeId: string) => {
    await updateNudgeAction(nudgeId, 'accepted');
  };

  const dismissNudge = async (nudgeId: string) => {
    await updateNudgeAction(nudgeId, 'dismissed');
  };

  const markAsIgnored = async (nudgeId: string) => {
    await updateNudgeAction(nudgeId, 'ignored');
  };

  const refreshNudges = async () => {
    setLoading(true);
    await fetchNudges();
  };

  // Find the most recent pending nudge that's less than 24 hours old
  const activeNudge = recentNudges.find(nudge => {
    if (nudge.user_action !== 'pending') return false;
    
    const nudgeTime = new Date(nudge.delivered_at);
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);
    
    return nudgeTime >= cutoffTime;
  }) || null;

  return {
    recentNudges,
    activeNudge,
    loading,
    acceptNudge,
    dismissNudge,
    markAsIgnored,
    refreshNudges,
  };
}