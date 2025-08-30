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
  if (currentPath === '/debug' || currentPath === '/debug/') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
        
        {/* DEV Environment Warning */}
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Development Environment - Debug tools active
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/debug/photo')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted"
          >
            <h3 className="font-semibold">📸 Photo Sandbox</h3>
            <p className="text-muted-foreground">Test photo pipeline with camera and force mode</p>
          </button>
          
          {/* V2 Enhanced Health Report Test - Debug Only */}
          <button 
            onClick={() => navigate('/standalone-test')}
            className="block w-full text-left p-4 bg-card rounded-lg border hover:bg-muted bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30"
          >
            <h3 className="font-semibold">🧪 Test Enhanced Report (V2)</h3>
            <p className="text-muted-foreground">Test V2 health report with nutrition toggle, flags tab, and AI suggestions</p>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              ⚡ entry=standalone • Logs [REPORT][V2][BOOT] to console
            </div>
          </button>

          {/* V2 Rollout Debug Controls */}
          <div className="p-4 bg-card rounded-lg border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
            <h3 className="font-semibold mb-3">🎛️ V2 Rollout Controls</h3>
            <p className="text-muted-foreground text-sm mb-4">Override V2 behavior for this device (localStorage)</p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  localStorage.setItem('health_report_v2_override', 'enabled');
                  alert('✅ V2 enabled for this device');
                }}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                Enable V2 for this device
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('health_report_v2_override', 'disabled');
                  alert('❌ V2 disabled for this device');
                }}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Disable V2 for this device
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('health_report_v2_override');
                  alert('🔄 Reset to rollout flags');
                }}
                className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Reset Override
              </button>
            </div>
            <div className="mt-3 text-xs text-orange-700 dark:text-orange-300">
              Current: {localStorage.getItem('health_report_v2_override') || 'No override (uses rollout flags)'}
            </div>
          </div>
          
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