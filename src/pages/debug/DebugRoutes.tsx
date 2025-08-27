import { Routes, Route } from 'react-router-dom';
import { NudgesQA } from './NudgesQA';
import { HeroSubtextQA } from './HeroSubtextQA';

export default function DebugRoutes() {
  return (
    <Routes>
      <Route path="nudges-qa" element={<NudgesQA />} />
      <Route path="hero-subtext" element={<HeroSubtextQA />} />
    </Routes>
  );
}