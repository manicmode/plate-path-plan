import { Routes, Route } from 'react-router-dom';
import { NudgesQA } from './NudgesQA';

export default function DebugRoutes() {
  return (
    <Routes>
      <Route path="nudges-qa" element={<NudgesQA />} />
    </Routes>
  );
}