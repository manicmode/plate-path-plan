import { Routes, Route } from 'react-router-dom';
import { NudgesQA } from './NudgesQA';
import { ScanHubDebug } from './ScanHubDebug';
import CameraDebug from './CameraDebug';
import DebugCamPure from './DebugCamPure';
import DebugCamPhoto from './DebugCamPhoto';

export default function DebugRoutes() {
  return (
    <Routes>
      <Route path="nudges-qa" element={<NudgesQA />} />
      <Route path="scan-hub" element={<ScanHubDebug />} />
      <Route path="camera" element={<CameraDebug />} />
      <Route path="cam-pure" element={<DebugCamPure />} />
      <Route path="cam-photo" element={<DebugCamPhoto />} />
    </Routes>
  );
}