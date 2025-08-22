import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureFlagGuard } from "@/components/FeatureFlagGuard";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { notify } from "@/lib/notify";

export function VoiceCoachEntry({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  
  // Show hint when globally disabled
  if (killSwitchDisabled) {
    return (
      <div className="text-xs text-muted-foreground">
        Voice Coach is globally disabled.
      </div>
    );
  }

  return (
    <FeatureFlagGuard flag="voice_coach_mvp" fallback={null}>
      <Button
        size="sm"
        variant="secondary"
        className={`rounded-full gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all ${className}`}
        aria-label="Start Voice Coach"
        onClick={() => {
          try { 
            nav("/voice-coach"); 
          } catch { 
            notify.info("Launching Voice Coach…"); 
          }
        }}
      >
        <Mic className="h-4 w-4" />
        <span>🎙️ Voice Coach</span>
      </Button>
    </FeatureFlagGuard>
  );
}