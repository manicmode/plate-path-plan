import { SleepNudge } from '@/components/nudges/SleepNudge';
import { NudgeRenderProps } from '@/nudges/registry';

export function SleepPrepNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  return (
    <SleepNudge 
      onDismiss={onDismiss}
      onAccept={onCta}
    />
  );
}