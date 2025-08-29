import { useNavigate } from 'react-router-dom';
import DebugImageProbe from './DebugImageProbe';
import { NudgesAudit } from './debug/NudgesAudit';
import { NudgesQA } from './debug/NudgesQA';
import { lazy, Suspense } from 'react';

const HealthScanFallbacks = lazy(() => import('./debug/HealthScanFallbacks'));

export default function DebugRoutes() {
  const navigate = useNavigate();
  
  // Simple routing for debug page
  const currentPath = window.location.pathname;
  
  if (currentPath === '/debug/image-probe') {
    return <DebugImageProbe />;
  }
  
  if (currentPath === '/debug/healthscan-fallbacks') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <HealthScanFallbacks />
      </Suspense>
    );
  }
  
  if (currentPath === '/debug/nudges') {
    return <NudgesAudit />;
  }

  if (currentPath === '/debug/nudges-qa') {
    return <NudgesQA />;
  }

  if (currentPath === '/debug/camera') {
    const CameraDebug = lazy(() => import('./debug/CameraDebug'));
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <CameraDebug />
      </Suspense>
    );
  }
  
  // If on /debug, show menu
  if (currentPath === '/debug') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/debug/photo')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">📸 Photo Sandbox</h3>
            <p className="text-muted-foreground">Test photo pipeline with camera and force mode</p>
          </button>
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
            onClick={() => navigate('/debug/healthscan-fallbacks')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Health Scan Fallbacks</h3>
            <p className="text-muted-foreground">Test and debug manual text & voice search flows</p>
          </button>
          <button 
            onClick={() => navigate('/debug/camera')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">Camera & Torch Debug</h3>
            <p className="text-muted-foreground">Test camera capabilities and flashlight functionality</p>
          </button>
        </div>
      </div>
    );
  }
  
  return null;
}