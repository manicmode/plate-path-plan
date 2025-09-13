import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { MANUAL_FX } from '@/config/flags';

interface InterstitialLoaderProps {
  isVisible: boolean;
  onComplete?: () => void;
  maxDuration?: number; // ms
}

const MESSAGES = [
  'Fetching nutrition…',
  'Assembling ingredients…',
  'Getting images…'
];

export function InterstitialLoader({ 
  isVisible, 
  onComplete,
  maxDuration = 800 
}: InterstitialLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [startTime] = useState(() => Date.now());

  // Rotate messages every 600ms
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % MESSAGES.length);
    }, 600);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Auto-hide after maxDuration if still visible
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      console.log('[INTERSTITIAL][TIMEOUT]');
      onComplete?.();
    }, maxDuration);

    return () => clearTimeout(timer);
  }, [isVisible, maxDuration, onComplete]);

  // Log when showing/hiding
  useEffect(() => {
    if (isVisible) {
      console.log('[INTERSTITIAL][SHOW]', { 
        source: 'manual', 
        maxDuration 
      });
    } else if (startTime) {
      const elapsedMs = Date.now() - startTime;
      console.log('[INTERSTITIAL][HIDE]', { 
        ready: true, 
        elapsedMs 
      });
    }
  }, [isVisible, startTime, maxDuration]);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[700] flex items-center justify-center backdrop-blur-sm bg-background/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fxEnabled ? 0.15 : 0 }}
        >
          <motion.div
            className="bg-card border rounded-xl p-6 shadow-xl max-w-sm mx-4"
            initial={fxEnabled ? { scale: 0.95, y: 10 } : undefined}
            animate={{ scale: 1, y: 0 }}
            exit={fxEnabled ? { scale: 0.95, y: 10 } : undefined}
            transition={{ duration: fxEnabled ? 0.15 : 0, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex flex-col items-center gap-4">
              {/* Spinner with breathing pulse */}
              <div className="relative">
                <Loader2 
                  className={`h-8 w-8 text-primary animate-spin ${
                    fxEnabled ? 'animate-pulse' : ''
                  }`}
                />
                
                {/* Breathing ring effect */}
                {fxEnabled && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.2, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </div>

              {/* Rotating message */}
              <div 
                className="text-sm text-center text-muted-foreground min-h-[20px]"
                aria-live="polite"
                aria-busy="true"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={messageIndex}
                    initial={fxEnabled ? { opacity: 0, y: 5 } : undefined}
                    animate={{ opacity: 1, y: 0 }}
                    exit={fxEnabled ? { opacity: 0, y: -5 } : undefined}
                    transition={{ duration: fxEnabled ? 0.2 : 0 }}
                  >
                    {MESSAGES[messageIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}