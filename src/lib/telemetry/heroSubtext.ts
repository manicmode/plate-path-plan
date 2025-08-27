/**
 * Telemetry utilities for Hero Subtext content engine
 * Logs shown/cta events to subtext_events table with RLS tolerance
 */

import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export interface SubtextTelemetryEvent {
  pickedId: string;
  category: string;
  event: 'shown' | 'cta';
  reason?: string;
  runId: string;
  userId?: string;
}

/**
 * Log a telemetry event for hero subtext
 * Swallows errors to avoid blocking UI
 */
export async function logSubtextEvent(eventData: SubtextTelemetryEvent): Promise<void> {
  try {
    const { error } = await supabase.from('subtext_events').insert({
      picked_id: eventData.pickedId,
      category: eventData.category,
      event: eventData.event,
      reason: eventData.reason,
      run_id: eventData.runId,
      user_id: eventData.userId // Let Supabase default if not provided
    });

    if (error) {
      console.warn('[SubtextTelemetry] Failed to log event:', error.message);
    } else {
      console.debug('[SubtextTelemetry] Logged:', {
        event: eventData.event,
        id: eventData.pickedId,
        runId: eventData.runId
      });
    }
  } catch (err) {
    console.warn('[SubtextTelemetry] Exception logging event:', err);
  }
}

/**
 * Generate a unique run ID for this render cycle
 */
export function generateRunId(): string {
  return crypto.randomUUID();
}

/**
 * Hook to check if telemetry is enabled
 */
export function useSubtextTelemetryEnabled(): boolean {
  const { enabled } = useFeatureFlag('subtext_telemetry_enabled');
  return enabled;
}