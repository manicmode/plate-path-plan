import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { FF } from '@/featureFlags';
import { NudgesQA } from './NudgesQA';
import { ScanHubDebug } from './ScanHubDebug';
import CameraDebug from './CameraDebug';
const PhotoSandbox = React.lazy(() => import('./PhotoSandbox'));

export default function DebugRoutes() {
  if (!import.meta.env.DEV) {
    return null;
  }
  
  const enableSandbox = import.meta.env.DEV || FF.PHOTO_SANDBOX_ALLOW_PROD;
  
  return (
    <Routes>
      <Route path="nudges-qa" element={<NudgesQA />} />
      <Route path="scan-hub" element={<ScanHubDebug />} />
      <Route path="camera" element={<CameraDebug />} />
      
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