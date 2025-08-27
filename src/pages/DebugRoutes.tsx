import { useNavigate } from 'react-router-dom';
import DebugImageProbe from './DebugImageProbe';
import { NudgesAudit } from './debug/NudgesAudit';
import { NudgesQA } from './debug/NudgesQA';
import HeroSubtextQA from './debug/HeroSubtextQA';
import HeroSubtextMetrics from './debug/HeroSubtextMetrics';
import AnalyzerOneClick from './debug/AnalyzerOneClick';

export default function DebugRoutes() {
  const navigate = useNavigate();
  
  // Simple routing for debug page
  const currentPath = window.location.pathname;
  
  if (currentPath === '/debug/image-probe') {
    return <DebugImageProbe />;
  }
  
  if (currentPath === '/debug/nudges') {
    return <NudgesAudit />;
  }

  if (currentPath === '/debug/nudges-qa') {
    return <NudgesQA />;
  }

  if (currentPath === '/debug/hero-subtext') {
    return <HeroSubtextQA />;
  }

  if (currentPath === '/debug/hero-subtext-metrics') {
    return <HeroSubtextMetrics />;
  }

  if (currentPath === '/debug/analyzer-oneclick') {
    return <AnalyzerOneClick />;
  }
  
  // If on /debug, show menu
  if (currentPath === '/debug') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/debug/image-probe')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Image Analysis Probe</h3>
            <p className="text-muted-foreground">Test image analyzer pipeline step-by-step</p>
          </button>
          <button 
            onClick={() => navigate('/debug/nudges')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Nudge Audit</h3>
            <p className="text-muted-foreground">Debug nudge scheduler behavior and history</p>
          </button>
          <button 
            onClick={() => navigate('/debug/nudges-qa')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Nudge QA System</h3>
            <p className="text-muted-foreground">Automated testing and reporting for nudge scheduler</p>
          </button>
          <button 
            onClick={() => navigate('/debug/hero-subtext')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Hero Subtext QA</h3>
            <p className="text-muted-foreground">Test hero subtext content engine with deterministic scenarios</p>
          </button>
          <button 
            onClick={() => navigate('/debug/hero-subtext-metrics')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Hero Subtext Metrics</h3>
            <p className="text-muted-foreground">View telemetry metrics and analytics for hero subtext</p>
          </button>
          <button 
            onClick={() => navigate('/debug/analyzer-oneclick')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Image Analyzer Probe</h3>
            <p className="text-muted-foreground">One-click diagnostic testing for health scan image analysis</p>
          </button>
        </div>
      </div>
    );
  }
  
  return null;
}