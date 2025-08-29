import { Routes, Route } from 'react-router-dom';
import { NudgesQA } from './NudgesQA';
import { ScanHubDebug } from './ScanHubDebug';
import CameraDebug from './CameraDebug';
import PhotoSandbox from './PhotoSandbox';

export default function DebugRoutes() {
  if (!import.meta.env.DEV) {
    return null;
  }
  
  return (
    <Routes>
      <Route path="nudges-qa" element={<NudgesQA />} />
      <Route path="scan-hub" element={<ScanHubDebug />} />
      <Route path="camera" element={<CameraDebug />} />
      <Route path="photo" element={<PhotoSandbox />} />
    </Routes>
  );
}