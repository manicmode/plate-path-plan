import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { selectNudgesForUser, SelectedNudge } from '@/nudges/scheduler';
import { logNudgeEvent } from '@/nudges/logEvent';
import { NUDGE_SCHEDULER_ENABLED, isUserInRollout } from '@/lib/flags';

const NUDGE_STORAGE_KEY = 'active_nudges';
const SHOWN_RUNIDS_KEY = 'shown_runids';

export function useNudgeScheduler() {
  const { user } = useAuth();
  const [selectedNudges, setSelectedNudges] = useState<SelectedNudge[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Persistence helpers
  const getStoredNudges = useCallback((): SelectedNudge[] => {
    if (!user?.id) return [];
    try {
      const stored = localStorage.getItem(`${NUDGE_STORAGE_KEY}_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [user?.id]);

  const storeNudges = useCallback((nudges: SelectedNudge[]) => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`${NUDGE_STORAGE_KEY}_${user.id}`, JSON.stringify(nudges));
    } catch (error) {
      console.error('Error storing nudges:', error);
    }
  }, [user?.id]);

  const getShownRunIds = useCallback((): Set<string> => {
    if (!user?.id) return new Set();
    try {
      const stored = localStorage.getItem(`${SHOWN_RUNIDS_KEY}_${user.id}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  }, [user?.id]);

  const addShownRunId = useCallback((runId: string) => {
    if (!user?.id) return;
    try {
      const existing = getShownRunIds();
      existing.add(runId);
      // Keep only last 100 to prevent localStorage bloat
      const asArray = Array.from(existing);
      const trimmed = asArray.slice(-100);
      localStorage.setItem(`${SHOWN_RUNIDS_KEY}_${user.id}`, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error storing shown runIds:', error);
    }
  }, [user?.id, getShownRunIds]);

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

  // Rehydrate from localStorage on mount
  useEffect(() => {
    if (!user?.id) return;
    const stored = getStoredNudges();
    if (stored.length > 0) {
      setSelectedNudges(stored);
      setLoading(false);
    }
  }, [user?.id, getStoredNudges]);

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
        storeNudges([]);
        return;
      }

      const nudges = await selectNudgesForUser(user.id, 2) as SelectedNudge[];
      setSelectedNudges(nudges);
      storeNudges(nudges);

      // Log nudge selection
      const { nlog } = await import('@/lib/debugNudge');
      if (nudges.length > 0) {
        for (const nudge of nudges) {
          nlog("NUDGE][PICK", { id: nudge.id, reason: nudge.reason, window: nudge.definition.window });
        }
      }

      // Log 'shown' events for NEW nudges only (not already shown)
      const shownRunIds = getShownRunIds();
      for (const nudge of nudges) {
        if ('runId' in nudge && 'reason' in nudge && !shownRunIds.has(nudge.runId)) {
          await logNudgeEvent({
            nudgeId: nudge.id,
            event: 'shown',
            reason: nudge.reason,
            runId: nudge.runId
          });
          addShownRunId(nudge.runId);
          nlog("NUDGE][RENDER", { id: nudge.id, runId: nudge.runId });
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
      
      // Remove from local state and storage
      const updated = selectedNudges.filter(n => n.runId !== nudge.runId);
      setSelectedNudges(updated);
      storeNudges(updated);
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
      
      // Remove from local state and storage
      const updated = selectedNudges.filter(n => n.runId !== nudge.runId);
      setSelectedNudges(updated);
      storeNudges(updated);
    } catch (error) {
      console.error('Error logging CTA for nudge:', error);
    }
  };

  useEffect(() => {
    loadNudges();
  }, [user?.id]);

  // Window-boundary refresh logic
  useEffect(() => {
    const calculateNextRefresh = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Define all nudge window boundaries
      const boundaries = [0, 9, 10, 19, 20, 21, 23, 24]; // All unique start/end hours
      
      // Find next boundary hour
      let nextBoundary = boundaries.find(hour => hour > currentHour);
      if (!nextBoundary) {
        nextBoundary = 24; // Next day midnight
      }
      
      const nextRefresh = new Date(now);
      if (nextBoundary === 24) {
        nextRefresh.setDate(nextRefresh.getDate() + 1);
        nextRefresh.setHours(0, 0, 0, 0);
      } else {
        nextRefresh.setHours(nextBoundary, 0, 0, 0);
      }
      
      return nextRefresh.getTime() - now.getTime();
    };

    const scheduleRefresh = () => {
      const msUntilNext = calculateNextRefresh();
      
      return setTimeout(() => {
        loadNudges(); // Refresh at window boundary
        
        // Schedule hourly refreshes
        const hourlyInterval = setInterval(loadNudges, 60 * 60 * 1000);
        
        // Clean up on next schedule
        return () => clearInterval(hourlyInterval);
      }, msUntilNext);
    };

    const timeout = scheduleRefresh();
    return () => clearTimeout(timeout);
  }, [user?.id]);

  return {
    selectedNudges,
    loading,
    dismissNudge,
    ctaNudge,
    refresh: loadNudges
  };
}