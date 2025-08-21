import { Button } from "@/components/ui/button";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useFeatureFlagActions } from "@/hooks/useFeatureFlagActions";
import { useMyFeatureFlags } from "@/hooks/useMyFeatureFlags";
import { notify } from "@/lib/notify";

export default function StartVoiceCoachButton() {
  const { enabled, loading } = useFeatureFlagOptimized("voice_coach_mvp");
  const { setUserFlag } = useFeatureFlagActions();
  const { refresh } = useMyFeatureFlags();

  const handleToggleUserOverride = async () => {
    const success = await setUserFlag("voice_coach_mvp", !enabled);
    if (success) {
      await refresh();
      notify.success(`Voice Coach ${(!enabled ? "enabled" : "disabled")} for you`);
    }
  };

  const handleStartVoiceCoach = () => {
    if (!enabled) {
      notify.info("Voice Coach is coming soon for your account.");
      return;
    }
    // Start flow logic would go here
    notify.info("Starting Voice Coach...");
  };

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={!enabled}
        onClick={handleStartVoiceCoach}
      >
        Start Voice Coach
      </Button>

      {/* Dev helper: quickly flip your own override */}
      <Button variant="outline" onClick={handleToggleUserOverride}>
        {enabled ? "Disable for me" : "Enable for me"}
      </Button>
    </div>
  );
}