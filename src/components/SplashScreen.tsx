import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useDeferredHomeDataLoading } from '@/hooks/useDeferredDataLoading';
import { useSound } from '@/contexts/SoundContext';

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
  const { playStartupChime, isEnabled } = useSound();
  
  // Mobile detection for debugging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Start preloading home data immediately when splash becomes visible
  const { isReady: homeDataReady } = useDeferredHomeDataLoading();

  console.log('💫 SplashScreen render:', { 
    isVisible, 
    homeDataReady, 
    isMobile,
    theme,
    timestamp: new Date().toISOString() 
  });

  // Play startup chime when splash becomes visible (only on cold start)
  useEffect(() => {
    if (!isVisible || !isEnabled) return;
    
    // Play startup sound with slight delay to sync with logo appearance
    const soundTimer = setTimeout(() => {
      playStartupChime().catch(error => {
        
      });
    }, 100); // Small delay to sync with logo animation start

    return () => clearTimeout(soundTimer);
  }, [isVisible, playStartupChime, isEnabled]);

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

  useEffect(() => {
    if (!isVisible) return;
    let done = false;
    const safeComplete = () => { if (done) return; done = true; onComplete(); };

    const max = setTimeout(() => {
      document.body.classList.remove('splash-visible');
      safeComplete();
    }, 2000);

    return () => { done = true; clearTimeout(max); };
  }, [isVisible, onComplete]);

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
              {/* VOYAGE Winged V Logo */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(20, 184, 166, 0.4)',
                    '0 0 60px rgba(59, 130, 246, 0.5)',
                    '0 0 30px rgba(20, 184, 166, 0.4)'
                  ]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut"
                }}
                 className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 shadow-2xl relative overflow-hidden"
               >
                 {/* Ambient Glow Behind V */}
                 <motion.div
                   animate={{
                     opacity: [0.3, 0.6, 0.3],
                     scale: [0.9, 1.1, 0.9]
                   }}
                   transition={{
                     repeat: Infinity,
                     duration: 3,
                     ease: "easeInOut"
                   }}
                   className="absolute inset-0 bg-gradient-radial from-teal-400/20 via-blue-500/10 to-transparent rounded-2xl blur-sm"
                 />

                 {/* Winged V Logo */}
                 <motion.div
                   animate={{
                     filter: [
                       'drop-shadow(0 0 15px rgba(20, 184, 166, 0.6))',
                       'drop-shadow(0 0 25px rgba(59, 130, 246, 0.8))',
                       'drop-shadow(0 0 15px rgba(20, 184, 166, 0.6))'
                     ]
                   }}
                   transition={{ 
                     repeat: Infinity, 
                     duration: 2,
                     ease: "easeInOut"
                   }}
                   className="relative z-10"
                 >
                   <img 
                     src="/lovable-uploads/06077524-4274-4512-a53f-779d8e98607f.png" 
                     alt="VOYAGE Winged V" 
                     className="w-16 h-16 object-contain"
                   />
                 </motion.div>

                 {/* Flash Effect */}
                 <motion.div
                   animate={{
                     opacity: [0, 0.8, 0],
                     scale: [0.8, 1.3, 0.8]
                   }}
                   transition={{
                     repeat: Infinity,
                     duration: 4,
                     ease: "easeInOut",
                     delay: 2
                   }}
                   className="absolute inset-0 bg-gradient-radial from-teal-300/40 via-blue-400/20 to-transparent rounded-2xl"
                 />

                {/* Circulating Stars */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      rotate: 360,
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      rotate: {
                        repeat: Infinity,
                        duration: 8,
                        ease: "linear"
                      },
                      opacity: {
                        repeat: Infinity,
                        duration: 3,
                        ease: "easeInOut",
                        delay: i * 0.5
                      }
                    }}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${50 + 35 * Math.cos((i * 60 * Math.PI) / 180)}%`,
                      top: `${50 + 35 * Math.sin((i * 60 * Math.PI) / 180)}%`,
                      transformOrigin: `${-35 * Math.cos((i * 60 * Math.PI) / 180)}px ${-35 * Math.sin((i * 60 * Math.PI) / 180)}px`
                    }}
                  />
                ))}
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