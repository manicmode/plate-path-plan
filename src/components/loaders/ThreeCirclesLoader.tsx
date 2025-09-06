import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
      className="fixed inset-0 z-[99999] bg-slate-900/[0.99] backdrop-blur-lg flex items-center justify-center"
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
        <div className="relative w-40 h-40">
          {/* Outer glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-emerald-400/20 blur-xl animate-pulse" />
          
          {/* Outer circle - largest, slowest */}
          <motion.div 
            className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-cyan-400/40 via-emerald-400/40 to-cyan-400/40 bg-clip-border"
            style={{
              background: 'conic-gradient(from 0deg, rgba(34, 211, 238, 0.4), rgba(16, 185, 129, 0.4), rgba(34, 211, 238, 0.4))',
              borderRadius: '50%',
              padding: '2px'
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-full h-full rounded-full bg-slate-900/50 backdrop-blur-sm" />
          </motion.div>
          
          {/* Middle circle - medium size, medium speed */}
          <motion.div 
            className="absolute inset-6 rounded-full border-3 border-transparent"
            style={{
              background: 'conic-gradient(from 180deg, rgba(16, 185, 129, 0.6), rgba(34, 211, 238, 0.6), rgba(16, 185, 129, 0.6))',
              borderRadius: '50%',
              padding: '2px'
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-full h-full rounded-full bg-slate-900/30 backdrop-blur-sm" />
          </motion.div>
          
          {/* Inner circle - smallest, fastest */}
          <motion.div 
            className="absolute inset-12 rounded-full border-2 border-transparent"
            style={{
              background: 'conic-gradient(from 90deg, rgba(34, 211, 238, 0.8), rgba(16, 185, 129, 0.8), rgba(34, 211, 238, 0.8))',
              borderRadius: '50%',
              padding: '1px'
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-full h-full rounded-full bg-slate-900/20 backdrop-blur-sm" />
          </motion.div>

          {/* Central pulsing core */}
          <motion.div 
            className="absolute inset-16 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
        </div>

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