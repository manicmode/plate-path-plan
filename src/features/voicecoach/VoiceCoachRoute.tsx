import { Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { FeatureFlagGuard } from "@/components/FeatureFlagGuard";
import StartVoiceCoachButton from "./StartVoiceCoachButton";

export default function VoiceCoachRoute() {
  const { isAdmin, loading } = useAdminRole();
  
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <FeatureFlagGuard
      flag="voice_coach_mvp"
      fallback={<div className="text-sm opacity-70 p-4">Voice Coach is disabled for your account.</div>}
    >
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Voice Coach Lab</h1>
        <StartVoiceCoachButton />
      </div>
    </FeatureFlagGuard>
  );
}