import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { selectNudgesForUser, SelectedNudge } from '@/nudges/scheduler';
import { logNudgeEvent } from '@/nudges/logEvent';
import { NUDGE_SCHEDULER_ENABLED, isUserInRollout } from '@/lib/flags';

export function useNudgeScheduler() {
  const { user } = useAuth();
  const [selectedNudges, setSelectedNudges] = useState<SelectedNudge[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Debug logging on boot
  useEffect(() => {
    const logBoot = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][BOOT", {
        tzOffsetMin: new Date().getTimezoneOffset(),
        flags: { NUDGE_SCHEDULER_ENABLED: true },
      });
    };
    logBoot();
  }, []);

  const loadNudges = async () => {
    if (!user?.id) {
      setSelectedNudges([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check feature flag and rollout
      const isEnabled = NUDGE_SCHEDULER_ENABLED && isUserInRollout(user.id);
      
      if (!isEnabled) {
        setSelectedNudges([]);
        return;
      }

      const nudges = await selectNudgesForUser(user.id, 2) as SelectedNudge[];
      setSelectedNudges(nudges);

      // Log nudge selection
      const { nlog } = await import('@/lib/debugNudge');
      if (nudges.length > 0) {
        for (const nudge of nudges) {
          nlog("NUDGE][PICK", { id: nudge.id, reason: nudge.reason, window: nudge.definition.window });
        }
      }

      // Log 'shown' events for selected nudges
      for (const nudge of nudges) {
        if ('runId' in nudge && 'reason' in nudge) {
          await logNudgeEvent({
            nudgeId: nudge.id,
            event: 'shown',
            reason: nudge.reason,
            runId: nudge.runId
          });
          nlog("NUDGE][RENDER", { id: nudge.id });
        }
      }
    } catch (error) {
      console.error('Error loading nudges:', error);
      setSelectedNudges([]);
    } finally {
      setLoading(false);
    }
  };

  const dismissNudge = async (nudge: SelectedNudge) => {
    try {
      await logNudgeEvent({
        nudgeId: nudge.id,
        event: 'dismissed',
        reason: 'user_dismissed',
        runId: nudge.runId
      });
      
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][SEEN", { id: nudge.id, action: 'dismissed' });
      
      // Remove from local state
      setSelectedNudges(prev => prev.filter(n => n.runId !== nudge.runId));
    } catch (error) {
      console.error('Error dismissing nudge:', error);
    }
  };

  const ctaNudge = async (nudge: SelectedNudge) => {
    try {
      await logNudgeEvent({
        nudgeId: nudge.id,
        event: 'cta',
        reason: 'user_clicked_cta',
        runId: nudge.runId
      });
      
      // Remove from local state
      setSelectedNudges(prev => prev.filter(n => n.runId !== nudge.runId));
    } catch (error) {
      console.error('Error logging CTA for nudge:', error);
    }
  };

  useEffect(() => {
    loadNudges();
  }, [user?.id]);

  // Refresh nudges daily
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      loadNudges(); // Refresh at midnight
      
      // Set up daily interval
      const interval = setInterval(loadNudges, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilMidnight);
    
    return () => clearTimeout(timeout);
  }, []);

  return {
    selectedNudges,
    loading,
    dismissNudge,
    ctaNudge,
    refresh: loadNudges
  };
}