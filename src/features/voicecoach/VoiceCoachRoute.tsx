import { useLocation } from "react-router-dom";
import StartVoiceCoachButton from "./StartVoiceCoachButton";
import { VoiceCoachDiagnostics } from "./VoiceCoachDiagnostics";

export default function VoiceCoachRoute() {
  const location = useLocation();
  
  // Check if debug mode is enabled
  const searchParams = new URLSearchParams(location.search);
  const debugMode = searchParams.get('debug') === 'vc';

  return (
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
  );
}