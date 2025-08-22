import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mic, AlertTriangle } from "lucide-react";
import { useFeatureFlagOptimized } from "@/hooks/useFeatureFlagOptimized";
import { useAdminRole } from "@/hooks/useAdminRole";
import VoiceAgentPage from "@/features/voiceagent/VoiceAgentPage";

export default function VoiceAgent() {
  return <VoiceAgentPage />;
}