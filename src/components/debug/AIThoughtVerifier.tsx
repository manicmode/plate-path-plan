import React from 'react';
import { Button } from '@/components/ui/button';
import { playAIThought } from '@/utils/SoundManager';

export const AIThoughtVerifier: React.FC = () => {
  // Dev-only component: render nothing outside development
  if (!import.meta.env.DEV) return null;

  const handleDefault = () => {
    console.log('[AIThoughtVerifier] playAIThought()');
    void playAIThought();
  };

  const handleNumber = () => {
    console.log('[AIThoughtVerifier] playAIThought(1.2)');
    void playAIThought(1.2);
  };

  const handleObject = () => {
    console.log('[AIThoughtVerifier] playAIThought({ playbackRate: 1.3, detune: -200 })');
    void playAIThought({ playbackRate: 1.3, detune: -200 });
  };

  return (
    <section aria-label="AI Thought Verifier" className="space-y-3">
      <div className="text-sm opacity-70">AIThought overload verification (dev-only)</div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleDefault} variant="outline" size="sm">Default</Button>
        <Button onClick={handleNumber} variant="outline" size="sm">Number</Button>
        <Button onClick={handleObject} variant="outline" size="sm">Object</Button>
      </div>
    </section>
  );
};
