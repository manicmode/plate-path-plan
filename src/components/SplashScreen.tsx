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
                {/* Amazing Neon Rocket Logo */}
                <motion.div
                  animate={{
                    filter: [
                      'drop-shadow(0 0 20px rgba(20, 184, 166, 0.6)) drop-shadow(0 0 40px rgba(147, 51, 234, 0.3))',
                      'drop-shadow(0 0 30px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 60px rgba(147, 51, 234, 0.4))',
                      'drop-shadow(0 0 20px rgba(20, 184, 166, 0.6)) drop-shadow(0 0 40px rgba(147, 51, 234, 0.3))'
                    ]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 4,
                    ease: "easeInOut"
                  }}
                >
                  <svg 
                    width="40" 
                    height="40" 
                    viewBox="0 0 100 120" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-xl"
                  >
                    <defs>
                      {/* VOYAGE Brand Rocket Gradient */}
                      <linearGradient id="voyageRocketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#14b8a6" /> {/* Teal */}
                        <stop offset="50%" stopColor="#3b82f6" /> {/* Sky Blue */}
                        <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet */}
                      </linearGradient>
                      
                      {/* Flame Gradient */}
                      <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" /> {/* Amber */}
                        <stop offset="50%" stopColor="#ef4444" /> {/* Red */}
                        <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet */}
                      </linearGradient>
                      
                      {/* Rocket Glow Filter */}
                      <filter id="rocketGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                      
                      {/* Swirl Gradient */}
                      <linearGradient id="swirlGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    
                    {/* Transformation Swirls */}
                    <path 
                      d="M20 80 Q30 70, 40 80 T60 80" 
                      stroke="url(#swirlGradient)" 
                      strokeWidth="2" 
                      fill="none" 
                      opacity="0.7"
                      filter="url(#rocketGlow)"
                    />
                    <path 
                      d="M10 90 Q20 85, 30 90 T50 90" 
                      stroke="url(#swirlGradient)" 
                      strokeWidth="1.5" 
                      fill="none" 
                      opacity="0.5"
                      filter="url(#rocketGlow)"
                    />
                    
                    {/* Rocket Body - Main */}
                    <ellipse 
                      cx="50" 
                      cy="35" 
                      rx="8" 
                      ry="25" 
                      fill="url(#voyageRocketGradient)"
                      filter="url(#rocketGlow)"
                    />
                    
                    {/* Rocket Nose Cone */}
                    <path 
                      d="M42 10 L50 5 L58 10 L58 20 Q58 25, 50 25 Q42 25, 42 20 Z" 
                      fill="url(#voyageRocketGradient)"
                      filter="url(#rocketGlow)"
                    />
                    
                    {/* Rocket Fins */}
                    <path 
                      d="M35 50 L42 55 L42 65 L35 60 Z" 
                      fill="url(#voyageRocketGradient)"
                      filter="url(#rocketGlow)"
                    />
                    <path 
                      d="M65 50 L58 55 L58 65 L65 60 Z" 
                      fill="url(#voyageRocketGradient)"
                      filter="url(#rocketGlow)"
                    />
                    
                    {/* Window */}
                    <circle 
                      cx="50" 
                      cy="25" 
                      r="4" 
                      fill="rgba(255,255,255,0.9)"
                      filter="url(#rocketGlow)"
                    />
                    <circle 
                      cx="50" 
                      cy="25" 
                      r="2" 
                      fill="#3b82f6"
                      opacity="0.8"
                    />
                    
                    {/* Exhaust Flames */}
                    <path 
                      d="M45 60 Q50 70, 55 60 Q50 75, 45 60" 
                      fill="url(#flameGradient)"
                      filter="url(#rocketGlow)"
                      opacity="0.9"
                    />
                    <path 
                      d="M47 60 Q50 68, 53 60 Q50 72, 47 60" 
                      fill="#fbbf24"
                      filter="url(#rocketGlow)"
                      opacity="0.8"
                    />
                    
                    {/* Additional Transform Swirls */}
                    <path 
                      d="M70 75 Q75 70, 80 75 T90 75" 
                      stroke="url(#swirlGradient)" 
                      strokeWidth="1.5" 
                      fill="none" 
                      opacity="0.6"
                      filter="url(#rocketGlow)"
                    />
                    
                    {/* Rocket Detail Lines */}
                    <line 
                      x1="45" y1="40" x2="55" y2="40" 
                      stroke="rgba(255,255,255,0.6)" 
                      strokeWidth="1"
                    />
                    <line 
                      x1="45" y1="45" x2="55" y2="45" 
                      stroke="rgba(255,255,255,0.4)" 
                      strokeWidth="1"
                    />
                  </svg>
                </motion.div>
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