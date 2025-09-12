import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface HandoffOverlayProps {
  show: boolean;
}

export function HandoffOverlay({ show }: HandoffOverlayProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md grid place-items-center"
        >
          <div className="relative">
            {/* Animated gradient orb */}
            <div 
              className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-primary-glow to-primary opacity-60 animate-spin"
              style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, spin 4s linear infinite'
              }}
            />
            
            {/* Sparkles */}
            <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-gradient-to-br from-primary-glow to-primary animate-ping" />
            <div className="absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-gradient-to-br from-primary to-primary-glow animate-ping animation-delay-1000" />
            
            {/* Center loader */}
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
            </div>
          </div>
          
          {/* Optional text */}
          <div className="absolute bottom-1/3 text-center text-primary-foreground">
            <p className="text-sm opacity-80">Preparing your food...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}