import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChallengesTabs } from '@/components/challenges/ChallengesTabs';

export default function GameAndChallengePage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full" 
          onClick={() => navigate('/explore')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Game & Challenge
        </h1>
        <div className="w-10" /> {/* Spacer for balance */}
      </div>

      {/* Unified Challenges Interface */}
      <ChallengesTabs />
    </div>
  );
}

// Keep the alias for compatibility during transition
export { GameAndChallengePage as GameAndChallengePage_Min };
