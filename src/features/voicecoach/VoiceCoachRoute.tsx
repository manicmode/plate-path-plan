import { Navigate, useLocation } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { FeatureFlagGuard } from "@/components/FeatureFlagGuard";
import StartVoiceCoachButton from "./StartVoiceCoachButton";
import { VoiceCoachDiagnostics } from "./VoiceCoachDiagnostics";

export default function VoiceCoachRoute() {
  const { isAdmin, loading } = useAdminRole();
  const location = useLocation();
  
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  // Check if debug mode is enabled
  const searchParams = new URLSearchParams(location.search);
  const debugMode = searchParams.get('debug') === 'vc';

  return (
    <FeatureFlagGuard
      flag="voice_coach_mvp"
      fallback={<div className="text-sm opacity-70 p-4">Voice Coach is disabled for your account.</div>}
    >
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Voice Coach Lab</h1>
          {!debugMode && (
            <a 
              href="?debug=vc" 
              className="text-xs text-blue-600 hover:underline"
            >
              Diagnostics
            </a>
          )}
        </div>
        
        {debugMode && <VoiceCoachDiagnostics />}
        
        <StartVoiceCoachButton />
      </div>
    </FeatureFlagGuard>
  );
}