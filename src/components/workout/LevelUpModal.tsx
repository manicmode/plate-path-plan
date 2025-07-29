import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  xpToNext: number;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  newLevel,
  xpToNext
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [playedSound, setPlayedSound] = useState(false);

  // Trigger confetti and sound when modal opens
  useEffect(() => {
    if (isOpen && !playedSound) {
      setShowAnimation(true);
      
      // Play level-up sound
      try {
        const audio = new Audio('/sounds/level-up.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback - create a simple beep sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'square';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        });
      } catch (error) {
        console.log('Could not play sound:', error);
      }

      // Trigger confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      setPlayedSound(true);
    }
  }, [isOpen, playedSound]);

  const getMotivationalMessage = (level: number) => {
    const messages = [
      `Incredible! You've reached Level ${level}! Your dedication is paying off! 💪`,
      `Level ${level} unlocked! You're building unstoppable momentum! 🔥`,
      `Amazing progress! Level ${level} achieved! Keep crushing those goals! ⚡`,
      `Fantastic! Level ${level} is yours! Your consistency is inspiring! 🌟`,
      `Outstanding! Level ${level} complete! You're becoming stronger every day! 🏆`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const resetModalState = () => {
    setShowAnimation(false);
    setPlayedSound(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModalState}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-2 border-yellow-200 dark:border-yellow-700 shadow-2xl">
        <div className="text-center space-y-6 p-6">
          {/* Animated Trophy */}
          <div className="relative flex justify-center">
            <div className={`${showAnimation ? 'animate-scale-in' : ''} transition-all duration-500`}>
              <div className="relative">
                <Trophy 
                  size={80} 
                  className="text-yellow-500 dark:text-yellow-400 drop-shadow-lg animate-pulse" 
                />
                <div className="absolute -top-2 -right-2">
                  <Star size={24} className="text-yellow-400 animate-spin" />
                </div>
                <div className="absolute -bottom-2 -left-2">
                  <Zap size={20} className="text-orange-400 animate-bounce" />
                </div>
              </div>
            </div>
          </div>

          {/* Level Badge */}
          <div className="relative">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-yellow-500 dark:to-orange-600 rounded-full shadow-lg">
              <span className="text-2xl font-bold text-white">{newLevel}</span>
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 opacity-50 animate-ping"></div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Level Up! 🎉
            </h2>
            <p className="text-xl font-semibold text-yellow-700 dark:text-yellow-300">
              You've reached Level {newLevel}!
            </p>
          </div>

          {/* XP Progress */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              XP to next level: <span className="font-bold text-primary">{xpToNext}</span>
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: '0%' }}
              ></div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 border border-primary/20">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {getMotivationalMessage(newLevel)}
            </p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={resetModalState}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Continue Training! 💪
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};