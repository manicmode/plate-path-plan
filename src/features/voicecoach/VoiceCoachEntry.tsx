import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useAdminRole } from "@/hooks/useAdminRole";
import { notify } from "@/lib/notify";

export function VoiceCoachEntry({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  const { enabled: mvpEnabled } = useFeatureFlagOptimized("voice_coach_mvp");
  const { isAdmin } = useAdminRole();
  
  // Feature gating: allow if not kill-switched AND (admin OR MVP enabled)
  const isAllowed = !killSwitchDisabled && (isAdmin || mvpEnabled);
  
  // Show hint when globally disabled
  if (killSwitchDisabled) {
    return (
      <div className="text-xs text-muted-foreground">
        Voice Coach is disabled.
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className={`rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all ${className}`}
      aria-label="Start Voice Coach"
      onClick={() => {
        if (!isAllowed) {
          notify.info("Voice Coach access restricted.");
          return;
        }
        try { 
          nav("/voice-coach"); 
        } catch { 
          notify.info("Launching Voice Coach…"); 
        }
      }}
    >
      <span>🎙️ Talk to Coach</span>
    </Button>
  );
}