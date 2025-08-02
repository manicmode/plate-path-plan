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
                {/* Cinematic Winged V Logo */}
                <motion.div
                  animate={{
                    filter: [
                      'drop-shadow(0 0 30px rgba(20, 184, 166, 0.8)) drop-shadow(0 0 60px rgba(147, 51, 234, 0.4))',
                      'drop-shadow(0 0 50px rgba(59, 130, 246, 0.9)) drop-shadow(0 0 80px rgba(147, 51, 234, 0.5))',
                      'drop-shadow(0 0 30px rgba(20, 184, 166, 0.8)) drop-shadow(0 0 60px rgba(147, 51, 234, 0.4))'
                    ]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 4,
                    ease: "easeInOut"
                  }}
                  className="w-14 h-14 flex items-center justify-center relative"
                >
                  {/* Main Winged V Logo */}
                  <motion.img
                    src="/lovable-uploads/862d48fb-84de-473c-88a2-b654e5b83609.png"
                    alt=""
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.95, 1, 0.95],
                      filter: [
                        'brightness(0) invert(1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))',
                        'brightness(0) invert(1) drop-shadow(0 0 30px rgba(255, 255, 255, 1))',
                        'brightness(0) invert(1) drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))'
                      ]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "easeInOut"
                    }}
                    className="w-11 h-11 object-contain z-10"
                    style={{
                      filter: 'brightness(0) invert(1) drop-shadow(0 0 25px rgba(255, 255, 255, 0.9))',
                      textShadow: '0 0 30px rgba(255, 255, 255, 0.8)'
                    }}
                  />
                  
                  {/* Rotating Energy Rings */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 8,
                      ease: "linear"
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-10 h-10 rounded-full border border-teal-400/30 border-dashed" />
                  </motion.div>
                  
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 12,
                      ease: "linear"
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full border border-purple-400/20 border-dotted" />
                  </motion.div>
                  
                  {/* Rising Particle Mist */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        opacity: [0, 0.8, 0],
                        scale: [0.3, 1, 0.3],
                        y: [15, -15, 15],
                        x: [0, Math.sin(i) * 5, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3 + Math.random() * 2,
                        delay: Math.random() * 3,
                        ease: "easeInOut"
                      }}
                      className="absolute w-1 h-1 rounded-full bg-gradient-to-r from-white/60 to-teal-300/80"
                      style={{
                        left: `${20 + Math.cos(i * 45 * Math.PI / 180) * 25}px`,
                        top: `${20 + Math.sin(i * 45 * Math.PI / 180) * 25}px`,
                        filter: 'blur(0.5px)'
                      }}
                    />
                  ))}
                  
                  {/* Lens Flare Effect */}
                  <motion.div
                    animate={{
                      opacity: [0, 0.4, 0],
                      scale: [0.8, 1.2, 0.8],
                      rotate: [0, 180, 360]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 6,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-radial from-white/10 via-teal-400/5 to-transparent" />
                  </motion.div>
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