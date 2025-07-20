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
    
    const confettiItems = ['🎉', '🎊', '✨', '⭐', '🏆', '🥇', '🎇', '🌟', '💫', '🎈'];
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className={`absolute text-xl animate-bounce`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            {confettiItems[Math.floor(Math.random() * confettiItems.length)]}
          </div>
        ))}
        
        {/* Sparkle effects */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
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
    <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 border-2 border-yellow-200 shadow-2xl">
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="text-3xl animate-bounce">🏆</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Challenge Champions
            </h2>
            <div className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>🏆</div>
          </div>
          <p className="text-muted-foreground font-medium">{challengeName}</p>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Championship Results
          </p>
        </div>

        {/* Podium Display */}
        <div className="relative min-h-72 mb-6">
          {/* Stage/Platform Base */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4/5 h-4 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 rounded-lg shadow-lg" />
          
          <div className="flex items-end justify-center gap-6 h-full relative z-10">
            {podiumOrder.map((winner, index) => 
              renderPodiumSlot(winner, index)
            )}
          </div>
          {renderConfetti()}
          
          {/* Spotlight effects */}
          {animationState === 'celebrating' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute top-0 right-1/4 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-yellow-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
          )}
        </div>

        {/* Enhanced Controls */}
        <div className="flex items-center justify-between bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-white/80 dark:bg-gray-700/80"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-green-600" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </span>
          </div>
          
          <Button
            onClick={() => {
              setAnimationState('waiting');
              startAnimation();
              onReplay();
            }}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg gap-2"
          >
            <Play className="h-4 w-4" />
            🎬 Replay Ceremony
          </Button>
        </div>

        {/* Enhanced Animation Status */}
        {animationState !== 'complete' && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-3 text-sm bg-white/60 dark:bg-gray-800/60 px-4 py-2 rounded-full backdrop-blur-sm border border-yellow-200">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
              <span className="font-medium">
                {animationState === 'building' && '🏗️ Building the stage...'}
                {animationState === 'revealing' && '🎭 Revealing champions...'}
                {animationState === 'celebrating' && '🎉 Celebrating our heroes!'}
              </span>
            </div>
          </div>
        )}

        {/* Victory Message */}
        {animationState === 'complete' && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 px-4 py-2 rounded-full border border-yellow-300">
              <span className="text-lg">👑</span>
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Congratulations to our champions!
              </span>
              <span className="text-lg">👑</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};