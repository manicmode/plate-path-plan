import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { FeatureFlagGuard } from "@/components/FeatureFlagGuard";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";

export function VoiceCoachFAB() {
  const nav = useNavigate();
  const { enabled: killSwitchDisabled } = useFeatureFlagOptimized("voice_coach_disabled");
  
  // Hide if globally disabled
  if (killSwitchDisabled) {
    return null;
  }

  return (
    <FeatureFlagGuard flag="voice_coach_mvp" fallback={null}>
      <button
        aria-label="Start Voice Coach"
        onClick={() => nav("/voice-coach")}
        className="fixed bottom-20 right-5 z-40 rounded-full p-4 shadow-xl bg-primary text-primary-foreground hover:shadow-2xl hover:scale-105 transition-all"
      >
        <Mic className="h-5 w-5" />
      </button>
    </FeatureFlagGuard>
  );
}