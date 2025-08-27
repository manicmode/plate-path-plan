import { HydrationNudge } from '@/components/nudges/HydrationNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function HydrationNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  return (
    <HydrationNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}