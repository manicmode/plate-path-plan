import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { MANUAL_FX } from '@/config/flags';

interface ManualInterstitialLoaderProps {
  isVisible: boolean;
}

const LOADER_MESSAGES = [
  'Preparing your item…',
  'Fetching nutrition & ingredients'
];

export function ManualInterstitialLoader({ isVisible }: ManualInterstitialLoaderProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxEnabled = MANUAL_FX && !reducedMotion;

  // Listen for confirm:mounted event to hide immediately
  useEffect(() => {
    if (!isVisible) return;

    const onConfirmMounted = () => {
      setIsReady(true);
    };
    
    window.addEventListener('confirm:mounted', onConfirmMounted);
    
    const timeout = setTimeout(() => {
      setShowFallback(true);
    }, 9000);

    return () => {
      window.removeEventListener('confirm:mounted', onConfirmMounted);
      clearTimeout(timeout);
    };
  }, [isVisible]);

  // Reset ready state when visibility changes
  useEffect(() => {
    if (!isVisible) {
      setShowFallback(false);
      setIsReady(false);
    }
  }, [isVisible]);

  // Hide immediately when confirm card mounts
  const shouldShow = isVisible && !isReady;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="manual-loader-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fxEnabled ? 0.12 : 0 }}
        >
          <motion.div
            className="manual-loader-card"
            initial={fxEnabled ? { scale: 0.985, opacity: 0 } : undefined}
            animate={{ scale: 1, opacity: 1 }}
            exit={fxEnabled ? { scale: 0.985, opacity: 0 } : undefined}
            transition={{ 
              duration: fxEnabled ? 0.16 : 0, 
              ease: [0.22, 1, 0.36, 1] 
            }}
          >
            {/* Spinner */}
            <div className="manual-loader-spinner">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              
              {/* Breathing ring effect */}
              {fxEnabled && (
                <motion.div
                  className="manual-loader-ring"
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

            {/* Content */}
            <div className="manual-loader-content">
              <h4 className="manual-loader-title">
                {LOADER_MESSAGES[0]}
              </h4>
              <p className="manual-loader-subtitle">
                {LOADER_MESSAGES[1]}
              </p>
              
              {showFallback && (
                <motion.p
                  initial={fxEnabled ? { opacity: 0 } : undefined}
                  animate={{ opacity: 1 }}
                  className="manual-loader-fallback"
                >
                  Still working…
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}