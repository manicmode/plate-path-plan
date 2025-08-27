import { MoodCheckinBanner } from '@/components/mood/MoodCheckinBanner';
import { NudgeRenderProps } from '@/nudges/registry';

export function DailyCheckInNudgeWrapper({ runId, onDismiss, onCta }: NudgeRenderProps) {
  return (
    <MoodCheckinBanner 
      onDismiss={onDismiss}
    />
  );
}