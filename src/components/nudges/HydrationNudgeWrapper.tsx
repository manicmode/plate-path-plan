import { useEffect } from 'react';
import { HydrationNudge } from '@/components/nudges/HydrationNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function HydrationNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  // Log shown on first render (guarded by runId)
  useEffect(() => {
    const logShown = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][WRAPPER_RENDER", { 
        id: 'hydration_reminder', 
        runId, 
        component: 'HydrationNudgeWrapper' 
      });
    };
    logShown();
  }, [runId]);

  return (
    <HydrationNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}