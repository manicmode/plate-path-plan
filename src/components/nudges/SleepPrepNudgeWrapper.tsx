import { useEffect } from 'react';
import { SleepNudge } from '@/components/nudges/SleepNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function SleepPrepNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  // Log shown on first render (guarded by runId)
  useEffect(() => {
    const logShown = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][WRAPPER_RENDER", { 
        id: 'sleep_prep', 
        runId, 
        component: 'SleepPrepNudgeWrapper' 
      });
    };
    logShown();
  }, [runId]);

  return (
    <SleepNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}