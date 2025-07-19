
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface RealtimeUpdate {
  challengeId: string;
  userId: string;
  progress: number;
  type: 'progress' | 'completion' | 'join' | 'leave';
}

export const useChallengeRealtime = (challengeIds: string[]) => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);

  useEffect(() => {
    if (!user || challengeIds.length === 0) return;

    const channels = challengeIds.map(challengeId => {
      const channel = supabase
        .channel(`challenge-${challengeId}`)
        .on('broadcast', { event: 'progress_update' }, (payload) => {
          setUpdates(prev => [...prev, payload as RealtimeUpdate]);
        })
        .on('broadcast', { event: 'challenge_complete' }, (payload) => {
          setUpdates(prev => [...prev, { ...payload, type: 'completion' } as RealtimeUpdate]);
        })
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, challengeIds]);

  const broadcastProgress = async (challengeId: string, progress: number) => {
    await supabase.channel(`challenge-${challengeId}`).send({
      type: 'broadcast',
      event: 'progress_update',
      payload: { challengeId, userId: user?.id, progress, type: 'progress' }
    });
  };

  return { updates, broadcastProgress };
};
