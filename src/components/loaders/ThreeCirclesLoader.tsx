import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MagicOrb from '@/components/common/MagicOrb';

interface ThreeCirclesLoaderProps {}

/**
 * Magical orb-like loading animation with complete scroll lock and enhanced visuals
 */
export function ThreeCirclesLoader({}: ThreeCirclesLoaderProps) {
  // Enhanced scroll lock when component mounts
  React.useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    
    // Prevent all scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.left = '0';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = originalDocumentOverflow;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[99999] bg-slate-900/[0.85] backdrop-blur-md flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tcl-title"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        minWidth: '100vw',
        maxHeight: '100vh',
        maxWidth: '100vw',
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none'
      }}
      onTouchMove={(e) => e.preventDefault()}
      onWheel={(e) => e.preventDefault()}
    >
      <span id="tcl-title" className="sr-only">Loading</span>

      <div className="flex flex-col items-center space-y-12">
        {/* Magical orb with three concentric circles */}
        <MagicOrb size={160} speedSec={3.2} />

        {/* Loading text with animation */}
        <motion.div 
          className="text-center"
          animate={{ 
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
        >
          <h3 className="text-white text-xl font-medium mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-emerald-300">
            Searching brands • generics • restaurants...
          </h3>
        </motion.div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          [data-motion-reduce] * {
            animation: none !important;
          }
        }
      `}</style>
    </motion.div>
  );
}