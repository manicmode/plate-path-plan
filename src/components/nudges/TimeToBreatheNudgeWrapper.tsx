import { TimeToBreatheNudge } from '@/components/nudges/TimeToBreatheNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function TimeToBreatheNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  return (
    <TimeToBreatheNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}