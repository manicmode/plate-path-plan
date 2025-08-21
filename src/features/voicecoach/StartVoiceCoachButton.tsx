import { Button } from "@/components/ui/button";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useFeatureFlagActions } from "@/hooks/useFeatureFlagActions";
import { useMyFeatureFlags } from "@/hooks/useMyFeatureFlags";
import { notify } from "@/lib/notify";

export default function StartVoiceCoachButton() {
  const { enabled, loading } = useFeatureFlagOptimized("voice_coach_mvp");
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { setUserFlag } = useFeatureFlagActions();
  const { refresh } = useMyFeatureFlags();

  // Environment checks
  const inIframe = typeof window !== 'undefined' && window.top !== window.self;
  const insecure = typeof window !== 'undefined' && !window.isSecureContext;

  const handleToggleUserOverride = async () => {
    const success = await setUserFlag("voice_coach_mvp", !enabled);
    if (success) {
      await refresh();
      notify.success(`Voice Coach ${(!enabled ? "enabled" : "disabled")} for you`);
    }
  };

  const handleStartVoiceCoach = async () => {
    if (!enabled) {
      notify.info("Voice Coach is coming soon for your account.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // TODO: Start recording with the returned stream
      notify.success("Microphone access granted! Starting Voice Coach...");
      
      // Stop the stream for now since we're just testing permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        notify.error('Microphone permission is required. Tap the address bar → Website Settings → Microphone → Allow.');
      } else if (error?.name === 'NotFoundError') {
        notify.error('No microphone detected on this device.');
      } else if (inIframe || insecure) {
        notify.error('Open in a new browser tab (HTTPS) to use the microphone.');
      } else {
        notify.error('Could not access microphone.');
      }
    }
  };

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={killSwitchDisabled}
        onClick={handleStartVoiceCoach}
      >
        Start a Voice Session
      </Button>

      {(inIframe || insecure) && (
        <div className="mt-2 p-2 text-xs bg-muted/50 rounded border">
          Microphone requires HTTPS and a top-level tab.{' '}
          <a 
            href={typeof window !== 'undefined' ? window.location.href : '#'} 
            target="_blank" 
            rel="noreferrer" 
            className="underline hover:no-underline"
          >
            Open in Browser
          </a>
        </div>
      )}

      {/* Dev helper: quickly flip your own override */}
      <Button variant="outline" onClick={handleToggleUserOverride}>
        {enabled ? "Disable for me" : "Enable for me"}
      </Button>
    </div>
  );
}