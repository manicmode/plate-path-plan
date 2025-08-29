import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FF } from '@/featureFlags';
import { NudgesQA } from './NudgesQA';
import { ScanHubDebug } from './ScanHubDebug';
import CameraDebug from './CameraDebug';
const PhotoSandbox = React.lazy(() => import('./PhotoSandbox'));

export default function DebugRoutes() {
  const enableSandbox = import.meta.env.DEV || FF.PHOTO_SANDBOX_ALLOW_PROD;
  
  // Allow debug routes in dev, or if specific flags are enabled
  const allowDebugRoutes = import.meta.env.DEV || enableSandbox;
  
  if (!allowDebugRoutes) {
    return null;
  }
  
  return (
    <Routes>
      {import.meta.env.DEV && (
        <>
          <Route path="nudges-qa" element={<NudgesQA />} />
          <Route path="scan-hub" element={<ScanHubDebug />} />
          <Route path="camera" element={<CameraDebug />} />
        </>
      )}
      
      {enableSandbox && (
        <>
          <Route
            path="photo"
            element={
              <React.Suspense fallback={<div style={{padding:24}}>Loading Photo Sandbox…</div>}>
                <PhotoSandbox />
              </React.Suspense>
            }
          />
          {/* redirect uppercase to lowercase for safety */}
          <Route path="PHOTO" element={<Navigate to="/debug/photo" replace />} />
        </>
      )}
    </Routes>
  );
}