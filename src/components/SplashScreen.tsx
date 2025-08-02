import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useDeferredHomeDataLoading } from '@/hooks/useDeferredDataLoading';

interface SplashScreenProps {
  isVisible: boolean;
  onComplete: () => void;
}

const motivationalQuotes = [
  "Discipline creates freedom.",
  "Small steps lead to big changes.",
  "Your future self will thank you.",
  "Progress, not perfection.",
  "Consistency beats intensity.",
  "Every choice shapes your journey.",
  "Wellness is a way of life.",
  "Transform one habit at a time."
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible, onComplete }) => {
  const { theme } = useTheme();
  const [loadingDots, setLoadingDots] = useState('');
  const [currentQuote] = useState(() => 
    motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
  );
  
  // Start preloading home data immediately when splash becomes visible
  const { isReady: homeDataReady } = useDeferredHomeDataLoading();

  // Animate loading dots
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setLoadingDots(prev => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Enhanced completion logic - wait for both timer and home data
  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setTimeout(() => {
      // Only complete splash when home data is ready too
      if (homeDataReady) {
        onComplete();
      } else {
        // If home data isn't ready yet, check every 100ms
        const readyCheck = setInterval(() => {
          if (homeDataReady) {
            clearInterval(readyCheck);
            onComplete();
          }
        }, 100);
        
        // Force complete after max 6 seconds to avoid infinite loading
        const forceTimer = setTimeout(() => {
          clearInterval(readyCheck);
          onComplete();
        }, 2000); // Additional 2s max wait
        
        return () => {
          clearInterval(readyCheck);
          clearTimeout(forceTimer);
        };
      }
    }, 4000); // Perfect 4s timing for optimal message readability

    return () => clearTimeout(timer);
  }, [isVisible, onComplete, homeDataReady]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800"
        >
          {/* Background AI Avatar Glow Effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 0.1, 
              scale: 1,
              transition: { duration: 2, ease: "easeOut" }
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-96 h-96 rounded-full blur-3xl bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600" />
          </motion.div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-md">
            
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { duration: 1, delay: 0, ease: "easeOut" } // Logo fades in over 1s
              }}
              className="mb-6"
            >
              {/* VOYAGE Logo */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(20, 184, 166, 0.3)',
                    '0 0 40px rgba(59, 130, 246, 0.4)',
                    '0 0 20px rgba(20, 184, 166, 0.3)'
                  ]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-teal-400 via-blue-500 to-purple-600 shadow-2xl"
              >
                {/* Elegant Lotus Flower Icon */}
                <svg 
                  width="36" 
                  height="36" 
                  viewBox="0 0 100 100" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-lg"
                >
                  {/* Lotus petals with gradient */}
                  <defs>
                    <linearGradient id="lotusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                      <stop offset="50%" stopColor="rgba(240,248,255,0.9)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* Outer petals */}
                  <path d="M50 20 C35 25, 25 35, 30 50 C25 35, 35 25, 50 20" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.8"/>
                  <path d="M80 50 C75 35, 65 25, 50 30 C65 25, 75 35, 80 50" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.8"/>
                  <path d="M50 80 C65 75, 75 65, 70 50 C75 65, 65 75, 50 80" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.8"/>
                  <path d="M20 50 C25 65, 35 75, 50 70 C35 75, 25 65, 20 50" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.8"/>
                  
                  {/* Middle petals */}
                  <path d="M50 30 C40 32, 32 40, 35 50 C32 40, 40 32, 50 30" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.9"/>
                  <path d="M70 50 C68 40, 60 32, 50 35 C60 32, 68 40, 70 50" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.9"/>
                  <path d="M50 70 C60 68, 68 60, 65 50 C68 60, 60 68, 50 70" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.9"/>
                  <path d="M30 50 C32 60, 40 68, 50 65 C40 68, 32 60, 30 50" fill="url(#lotusGradient)" filter="url(#glow)" opacity="0.9"/>
                  
                  {/* Inner petals */}
                  <path d="M50 35 C45 37, 37 45, 40 50 C37 45, 45 37, 50 35" fill="url(#lotusGradient)" filter="url(#glow)"/>
                  <path d="M65 50 C63 45, 55 37, 50 40 C55 37, 63 45, 65 50" fill="url(#lotusGradient)" filter="url(#glow)"/>
                  <path d="M50 65 C55 63, 63 55, 60 50 C63 55, 55 63, 50 65" fill="url(#lotusGradient)" filter="url(#glow)"/>
                  <path d="M35 50 C37 55, 45 63, 50 60 C45 63, 37 55, 35 50" fill="url(#lotusGradient)" filter="url(#glow)"/>
                  
                  {/* Center */}
                  <circle cx="50" cy="50" r="8" fill="url(#lotusGradient)" filter="url(#glow)" opacity="1"/>
                  <circle cx="50" cy="50" r="4" fill="rgba(255,255,255,1)" opacity="0.8"/>
                </svg>
              </motion.div>
            </motion.div>

            {/* App Name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.8, delay: 0.5, ease: "easeOut" } // Adjusted timing
              }}
              className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
              style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
            >
              VOYAGE
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.8, delay: 0.7, ease: "easeOut" } // Adjusted timing
              }}
              className="text-lg font-medium mb-6 tracking-wide text-gray-300"
              style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
            >
              AI Wellness Assistant
            </motion.p>

            {/* Loading Dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                transition: { duration: 0.5, delay: 1, ease: "easeOut" }
              }}
              className="text-2xl font-bold mb-4 h-8 flex items-center justify-center min-w-[60px] text-teal-400"
            >
              {loadingDots}
            </motion.div>

            {/* Motivational Quote */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.5, delay: 0.5, ease: "easeOut" } // Message appears 0.5s after logo starts
              }}
              className="text-sm italic max-w-xs leading-relaxed text-gray-400"
            >
              "{currentQuote}"
            </motion.p>
          </div>

          {/* Subtle Floating Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight
              }}
              animate={{
                opacity: [0, 0.3, 0],
                y: [
                  Math.random() * window.innerHeight,
                  Math.random() * window.innerHeight - 100,
                  Math.random() * window.innerHeight - 200
                ],
                transition: {
                  repeat: Infinity,
                  duration: 8 + Math.random() * 4,
                  ease: "easeInOut",
                  delay: Math.random() * 2
                }
              }}
              className="absolute w-1 h-1 rounded-full bg-gradient-to-r from-teal-400 to-blue-400"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};