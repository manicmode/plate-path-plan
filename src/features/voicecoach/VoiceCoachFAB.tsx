import { useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { FeatureFlagGuard } from "@/components/FeatureFlagGuard";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";

export function VoiceCoachFAB() {
  // Disabled: floating FAB removed from UI
  return null;
}