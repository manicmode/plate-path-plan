import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Star, Medal, Play, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSound } from '@/hooks/useSound';
import { useAuth } from '@/contexts/auth';

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
  const [celebrationShown, setCelebrationShown] = useState(false);
  
  const { user } = useAuth();
  const { playChallengeWin } = useSound();

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
    
    // Check if current user is in top 3 and trigger celebration
    const userWin = winners.find(w => w.userId === user?.id);
    if (userWin && userWin.podiumPosition <= 3 && !celebrationShown) {
      const position = userWin.podiumPosition;
      const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const medal = medals[position as keyof typeof medals] || '🏆';
      
      // Trigger celebration popup
      const celebrationEvent = new CustomEvent('showCelebration', {
        detail: {
          message: `You Made the Podium! ${medal}\nPosition #${position} in ${challengeName}`,
          type: 'podium'
        }
      });
      window.dispatchEvent(celebrationEvent);
      
      // Play victory sound
      playChallengeWin();
      
      setCelebrationShown(true);
    }
    
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

  // Enhanced podium slot renderer for the new realistic design
  const renderEnhancedPodiumSlot = (winner: PodiumWinner, position: 'left' | 'center' | 'right') => {
    const isRevealed = revealedPositions.has(winner.podiumPosition);
    const { emoji } = getTrophyIcon(winner.podiumPosition);
    
    // Enhanced podium heights for realistic appearance
    const getEnhancedHeight = () => {
      switch (winner.podiumPosition) {
        case 1: return 'h-40'; // Gold - tallest
        case 2: return 'h-32'; // Silver - medium  
        case 3: return 'h-24'; // Bronze - shortest
        default: return 'h-20';
      }
    };

    const getGradientColors = () => {
      switch (winner.podiumPosition) {
        case 1: return 'from-yellow-500 via-yellow-400 to-yellow-600'; // Gold
        case 2: return 'from-gray-400 via-gray-300 to-gray-500'; // Silver
        case 3: return 'from-amber-600 via-amber-500 to-amber-700'; // Bronze
        default: return 'from-gray-500 to-gray-600';
      }
    };

    const getRingColor = () => {
      switch (winner.podiumPosition) {
        case 1: return 'ring-yellow-400 ring-4'; 
        case 2: return 'ring-gray-300 ring-4';
        case 3: return 'ring-amber-500 ring-4';
        default: return 'ring-gray-400 ring-2';
      }
    };

    return (
      <div className="flex-1 flex flex-col items-center max-w-32">
        {/* Winner Info Above Podium */}
        <div className={`mb-3 transition-all duration-500 ${
          isRevealed 
            ? 'animate-scale-in opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}>
          <div className="text-center relative">
            {/* Glowing Avatar */}
            <div className="relative">
              <Avatar className={`h-20 w-20 mx-auto mb-2 ${getRingColor()} shadow-2xl`}>
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-slate-700 to-slate-800 text-white">
                  {winner.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Glowing ring effect */}
              <div className={`absolute inset-0 rounded-full ${
                winner.podiumPosition === 1 ? 'shadow-yellow-400/50' :
                winner.podiumPosition === 2 ? 'shadow-gray-300/50' : 'shadow-amber-500/50'
              } shadow-2xl animate-pulse`} />
            </div>
            
            {/* Large Trophy/Medal */}
            <div className={`text-6xl mb-2 drop-shadow-lg ${
              animationState === 'celebrating' ? 'animate-bounce' : ''
            } ${winner.podiumPosition === 1 ? 'filter drop-shadow-yellow-glow' : ''}`}>
              {emoji}
            </div>
            
            {/* Winner Name */}
            <h3 className="font-bold text-sm text-yellow-100 mb-1">{winner.displayName}</h3>
            <p className="text-xs text-yellow-300/60">@{winner.username}</p>
            
            {/* Score Badges */}
            <div className="mt-2 space-y-1">
              <Badge className="text-xs bg-yellow-500/20 text-yellow-200 border-yellow-400/30">
                Score: {Math.round(winner.finalScore)}
              </Badge>
              {winner.finalStreak > 0 && (
                <Badge variant="outline" className="text-xs border-orange-400/50 text-orange-300">
                  🔥 {winner.finalStreak} streak
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Enhanced Realistic Podium Step */}
        <div className={`w-24 ${getEnhancedHeight()} transition-all duration-700 relative ${
          animationState === 'building' || isRevealed
            ? `bg-gradient-to-t ${getGradientColors()} translate-y-0 shadow-2xl` 
            : 'bg-slate-600 translate-y-8'
        } rounded-t-xl border-2 border-white/20`}>
          
          {/* Podium Number */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-slate-800 font-bold text-lg">{winner.podiumPosition}</span>
            </div>
          </div>
          
          {/* Metallic shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-xl animate-pulse" />
          
          {/* Glow effect for 1st place */}
          {winner.podiumPosition === 1 && (
            <div className="absolute -inset-1 bg-gradient-to-t from-yellow-400/30 to-transparent blur-sm rounded-t-xl animate-pulse" />
          )}
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-400/30 shadow-2xl">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-transparent to-orange-900/20 animate-pulse" />
      
      {/* Star field background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6">
        {/* Glowing Header */}
        <div className="text-center mb-8">
          <div className="relative">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
              🏆 CHAMPIONS PODIUM 🏆
            </h2>
            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 blur-xl rounded-lg animate-pulse" />
          </div>
          <p className="text-yellow-200/80 font-semibold mt-2">{challengeName}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <p className="text-sm text-yellow-300/60">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Results
            </p>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Realistic 3-Step Podium */}
        <div className="relative min-h-80 mb-6">
          {/* Dramatic Stage Platform */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-6 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg shadow-2xl" />
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-11/12 h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg" />
          
          {/* Podium Steps Container */}
          <div className="flex items-end justify-center gap-4 h-full relative z-10 px-8">
            {/* 2nd Place - Left */}
            {second && renderEnhancedPodiumSlot(second, 'left')}
            
            {/* 1st Place - Center (Tallest) */}
            {first && renderEnhancedPodiumSlot(first, 'center')}
            
            {/* 3rd Place - Right */}
            {third && renderEnhancedPodiumSlot(third, 'right')}
          </div>
          
          {renderConfetti()}
          
          {/* Dramatic Spotlight Effects */}
          {animationState === 'celebrating' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-40 h-60 bg-yellow-400/30 rounded-full blur-3xl animate-pulse" />
              <div className="absolute top-0 right-1/4 w-40 h-60 bg-orange-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-80 bg-yellow-300/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
      </div>
    </div>
  );
};