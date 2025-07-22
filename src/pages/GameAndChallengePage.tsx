import { useState } from 'react';
import PublicChallengesTab from '@/components/challenges/PublicChallengesTab';
import YourChallengesTab from '@/components/challenges/YourChallengesTab';
import TrendingChallengesTab from '@/components/challenges/TrendingChallengesTab';

export default function GameAndChallengePage() {
  const [activeTab, setActiveTab] = useState<'public' | 'your' | 'trending' | 'micro'>('public');

  return (
    <div style={{ padding: '20px', color: 'white', textAlign: 'center' }}>
      <h1>🎮 Gaming & Challenges</h1>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button onClick={() => setActiveTab('public')}>Public</button>
        <button onClick={() => setActiveTab('your')}>Your</button>
        <button onClick={() => setActiveTab('trending')}>Trending</button>
        <button onClick={() => setActiveTab('micro')}>Micro</button>
      </div>

      <div style={{ marginTop: '40px' }}>
        {activeTab === 'public' && <PublicChallengesTab />}
        {activeTab === 'your' && <YourChallengesTab />}
        {activeTab === 'trending' && <TrendingChallengesTab />}
        {activeTab === 'micro' && <p>Placeholder for Micro</p>}
      </div>
    </div>
  );
}