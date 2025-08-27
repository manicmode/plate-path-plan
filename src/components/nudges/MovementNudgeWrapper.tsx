import { MovementNudge } from '@/components/nudges/MovementNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function MovementNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  return (
    <MovementNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}