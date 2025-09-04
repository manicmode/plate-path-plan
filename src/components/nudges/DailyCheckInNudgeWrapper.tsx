import { useEffect } from 'react';
import { MoodCheckinBanner } from '@/components/mood/MoodCheckinBanner';
import { NudgeRenderProps } from '@/nudges/registry';

export function DailyCheckInNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  // Log shown on first render (guarded by runId)
  useEffect(() => {
    const logShown = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][WRAPPER_RENDER", { 
        id: 'daily_checkin', 
        runId, 
        component: 'DailyCheckInNudgeWrapper' 
      });
    };
    logShown();
  }, [runId]);

  return (
    <MoodCheckinBanner 
      onDismiss={onDismiss}
    />
  );
}