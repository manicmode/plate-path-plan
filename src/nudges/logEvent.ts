import { supabase } from '@/integrations/supabase/client';

export type NudgeEvent = 'shown' | 'dismissed' | 'cta';

export interface LogNudgeEventParams {
  nudgeId: string;
  event: NudgeEvent;
  reason?: string;
  runId?: string;
}

export async function logNudgeEvent({
  nudgeId,
  event,
  reason,
  runId
}: LogNudgeEventParams) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn('Cannot log nudge event: user not authenticated');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('nudge_events')
      .insert({
        user_id: user.id,
        nudge_id: nudgeId,
        event,
        reason,
        run_id: runId
      })
      .select()
      .maybeSingle();

    if (error) {
      // If it's a unique constraint violation (duplicate run_id), that's expected
      if (error.code === '23505' && error.message.includes('uq_nudge_events_render')) {
        console.log('Duplicate nudge event prevented by unique constraint');
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to log nudge event:', error);
    throw error;
  }
}

// Utility functions for scheduler queries
export async function getLastShownDates(userId: string) {
  const { data, error } = await supabase
    .from('nudge_events')
    .select('nudge_id, ts')
    .eq('user_id', userId)
    .eq('event', 'shown')
    .order('ts', { ascending: false });

  if (error) throw error;

  // Group by nudge_id and get the latest timestamp for each
  const lastShown: Record<string, Date> = {};
  data?.forEach(event => {
    if (!lastShown[event.nudge_id]) {
      lastShown[event.nudge_id] = new Date(event.ts);
    }
  });

  return lastShown;
}

export async function get7DayCounts(userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('nudge_events')
    .select('nudge_id')
    .eq('user_id', userId)
    .eq('event', 'shown')
    .gte('ts', sevenDaysAgo.toISOString());

  if (error) throw error;

  // Count occurrences by nudge_id
  const counts: Record<string, number> = {};
  data?.forEach(event => {
    counts[event.nudge_id] = (counts[event.nudge_id] || 0) + 1;
  });

  return counts;
}

export async function getDailyAudit(days = 14) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('nudge_events')
    .select('ts, nudge_id, event, reason')
    .gte('ts', startDate.toISOString())
    .order('ts', { ascending: false });

  if (error) throw error;

  // Group by day, nudge_id, event, reason
  const audit: Record<string, Record<string, Record<string, Record<string, number>>>> = {};
  
  data?.forEach(event => {
    const day = new Date(event.ts).toISOString().split('T')[0];
    const nudgeId = event.nudge_id;
    const eventType = event.event;
    const reason = event.reason || 'no_reason';

    if (!audit[day]) audit[day] = {};
    if (!audit[day][nudgeId]) audit[day][nudgeId] = {};
    if (!audit[day][nudgeId][eventType]) audit[day][nudgeId][eventType] = {};
    
    audit[day][nudgeId][eventType][reason] = (audit[day][nudgeId][eventType][reason] || 0) + 1;
  });

  return audit;
}