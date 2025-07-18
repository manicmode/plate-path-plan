import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Star, Medal, Play, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface PodiumWinner {
  userId: string;
  username: string;
  displayName: string;
  finalScore: number;
  finalStreak: number;
  completionDate: string;
  podiumPosition: number;
  totalInteractions: number;
}

interface TrophyPodiumProps {
  winners: PodiumWinner[];
  challengeName: string;
  isVisible: boolean;
  onReplay: () => void;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export const TrophyPodium: React.FC<TrophyPodiumProps> = ({
  winners,
  challengeName,
  isVisible,
  onReplay,
  onComplete,
  autoPlay = true
}) => {
  const [animationState, setAnimationState] = useState<'waiting' | 'building' | 'revealing' | 'celebrating' | 'complete'>('waiting');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(new Set());

  // Sort winners by position for display (2nd left, 1st center, 3rd right)
  const sortedWinners = [...winners].sort((a, b) => a.podiumPosition - b.podiumPosition);
  const [first, second, third] = sortedWinners;

  // Arrange for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [second, first, third].filter(Boolean);

  useEffect(() => {
    if (isVisible && autoPlay && animationState === 'waiting') {
      startAnimation();
    }
  }, [isVisible, autoPlay]);

  const startAnimation = async () => {
    setAnimationState('building');
    setRevealedPositions(new Set());
    
    // Build podium animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setAnimationState('revealing');
    
    // Reveal winners one by one (3rd, 2nd, 1st)
    const revealOrder = [3, 2, 1];
    for (const position of revealOrder) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setRevealedPositions(prev => new Set([...prev, position]));
      
      // Sound effect for each reveal
      if (soundEnabled) {
        playRevealSound(position);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setAnimationState('celebrating');
    
    // Final celebration
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAnimationState('complete');
    onComplete?.();
  };

  const playRevealSound = (position: number) => {
    // Create audio context for sound effects
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different positions
      const frequencies = { 1: 523.25, 2: 440, 3: 349.23 }; // C5, A4, F4
      oscillator.frequency.setValueAtTime(frequencies[position as keyof typeof frequencies], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1: return 'h-32'; // Gold - tallest
      case 2: return 'h-24'; // Silver - medium
      case 3: return 'h-20'; // Bronze - shortest
      default: return 'h-16';
    }
  };

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 1: return { icon: Trophy, emoji: '🥇', color: 'text-yellow-500' };
      case 2: return { icon: Medal, emoji: '🥈', color: 'text-gray-400' };
      case 3: return { icon: Star, emoji: '🥉', color: 'text-amber-600' };
      default: return { icon: Star, emoji: '🏆', color: 'text-muted-foreground' };
    }
  };

  const renderConfetti = () => {
    if (animationState !== 'celebrating' && animationState !== 'complete') return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute text-2xl animate-bounce`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            {['🎉', '🎊', '✨', '⭐', '🏆'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    );
  };

  const renderPodiumSlot = (winner: PodiumWinner | undefined, displayPosition: number) => {
    if (!winner) return <div className="flex-1" />; // Empty slot
    
    const isRevealed = revealedPositions.has(winner.podiumPosition);
    const { icon: TrophyIcon, emoji, color } = getTrophyIcon(winner.podiumPosition);
    const podiumHeight = getPodiumHeight(winner.podiumPosition);
    
    return (
      <div className="flex-1 flex flex-col items-center">
        {/* Winner Avatar and Info */}
        <div className={`mb-4 transition-all duration-500 ${
          isRevealed 
            ? 'animate-scale-in opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}>
          <div className="text-center">
            <Avatar className={`h-16 w-16 mx-auto mb-2 ring-4 ${
              winner.podiumPosition === 1 
                ? 'ring-yellow-400' 
                : winner.podiumPosition === 2 
                ? 'ring-gray-300' 
                : 'ring-amber-500'
            }`}>
              <AvatarFallback className="text-lg font-bold">
                {winner.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className={`text-4xl mb-1 ${animationState === 'celebrating' ? 'animate-bounce' : ''}`}>
              {emoji}
            </div>
            
            <h3 className="font-bold text-sm">{winner.displayName}</h3>
            <p className="text-xs text-muted-foreground">@{winner.username}</p>
            
            <div className="mt-2 space-y-1">
              <Badge variant="secondary" className="text-xs">
                Score: {Math.round(winner.finalScore)}
              </Badge>
              {winner.finalStreak > 0 && (
                <Badge variant="outline" className="text-xs">
                  🔥 {winner.finalStreak} streak
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Podium Base */}
        <div className={`w-20 ${podiumHeight} transition-all duration-700 ${
          animationState === 'building' || isRevealed
            ? `bg-gradient-to-t ${
                winner.podiumPosition === 1 
                  ? 'from-yellow-500 to-yellow-300' 
                  : winner.podiumPosition === 2 
                  ? 'from-gray-400 to-gray-200' 
                  : 'from-amber-600 to-amber-400'
              } translate-y-0` 
            : 'bg-muted translate-y-8'
        } rounded-t-lg flex items-end justify-center pb-2 shadow-lg`}>
          <div className="text-white font-bold text-lg">
            {winner.podiumPosition}
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-bold">Challenge Champions</h2>
            <Trophy className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-muted-foreground">{challengeName}</p>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Results
          </p>
        </div>

        {/* Podium Display */}
        <div className="relative min-h-64 mb-6">
          <div className="flex items-end justify-center gap-4 h-full">
            {podiumOrder.map((winner, index) => 
              renderPodiumSlot(winner, index)
            )}
          </div>
          {renderConfetti()}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <Button
            onClick={() => {
              setAnimationState('waiting');
              startAnimation();
              onReplay();
            }}
            variant="secondary"
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            🎬 Replay Podium Ceremony
          </Button>
        </div>

        {/* Animation Status */}
        {animationState !== 'complete' && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              {animationState === 'building' && 'Building podium...'}
              {animationState === 'revealing' && 'Revealing winners...'}
              {animationState === 'celebrating' && 'Celebrating champions! 🎉'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};