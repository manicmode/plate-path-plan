import { useEffect } from 'react';
import { MovementNudge } from '@/components/nudges/MovementNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function MovementNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  // Log shown on first render (guarded by runId)
  useEffect(() => {
    const logShown = async () => {
      const { nlog } = await import('@/lib/debugNudge');
      nlog("NUDGE][WRAPPER_RENDER", { 
        id: 'movement_break', 
        runId, 
        component: 'MovementNudgeWrapper' 
      });
    };
    logShown();
  }, [runId]);

  return (
    <MovementNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}