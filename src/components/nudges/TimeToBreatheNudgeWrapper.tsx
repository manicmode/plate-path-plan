import { useEffect } from 'react';
import { TimeToBreatheNudge } from '@/components/nudges/TimeToBreatheNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function TimeToBreatheNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  // Log shown on first render (guarded by runId)
  useEffect(() => {
    const logShown = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][WRAPPER_RENDER", { 
        id: 'time_to_breathe', 
        runId, 
        component: 'TimeToBreatheNudgeWrapper' 
      });
    };
    logShown();
  }, [runId]);

  return (
    <TimeToBreatheNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}