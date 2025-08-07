import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface TransitionScreenProps {
  isOpen: boolean;
  currentIndex: number;
  totalItems: number;
  itemName: string;
  onComplete: () => void;
  duration?: number; // milliseconds, default 2500
}

export const TransitionScreen: React.FC<TransitionScreenProps> = ({
  isOpen,
  currentIndex,
  totalItems,
  itemName,
  onComplete,
  duration = 8000
}) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(duration / 1000));

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setTimeLeft(Math.ceil(duration / 1000));
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (duration / 100));
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 100);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [isOpen, duration, onComplete]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-8 text-center">
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl animate-bounce">⏳</span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {progress < 50 ? 'Loading next food item...' : 'Analyzing next bite...'}
            </h3>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>{progress < 50 ? 'Preparing' : 'Analyzing'} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{itemName}</span></p>
              {totalItems > 1 && <p>Item {currentIndex + 1} of {totalItems}</p>}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <Progress 
              value={progress} 
              className="w-full h-2"
            />
            
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{Math.round(progress)}%</span>
              <span>{timeLeft}s remaining</span>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalItems }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index < currentIndex
                    ? 'bg-emerald-500 scale-110'
                    : index === currentIndex
                    ? 'bg-blue-500 scale-125 animate-pulse'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};