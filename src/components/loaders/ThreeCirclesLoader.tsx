import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ThreeCirclesLoaderProps {}

/**
 * Simple three concentric circles loader for manual entry
 * Matches the clean design from image reference
 */
export function ThreeCirclesLoader({}: ThreeCirclesLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tcl-title"
    >
      <span id="tcl-title" className="sr-only">Loading</span>

      <div className="flex flex-col items-center space-y-8">
        {/* Three concentric circles animation */}
        <div className="relative w-24 h-24">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-[spin_3s_linear_infinite]" />
          
          {/* Middle circle */}
          <div className="absolute inset-2 rounded-full border-2 border-cyan-400/50 animate-[spin_2s_linear_infinite_reverse]" />
          
          {/* Inner circle */}
          <div className="absolute inset-4 rounded-full border-2 border-cyan-400/70 animate-[spin_1.5s_linear_infinite]" />
        </div>

        {/* Loading text */}
        <div className="text-center">
          <h3 className="text-white text-lg font-medium mb-2">
            Searching brands • generics • restaurants...
          </h3>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-[spin_3s_linear_infinite],
          .animate-[spin_2s_linear_infinite_reverse],
          .animate-[spin_1.5s_linear_infinite] { 
            animation: none !important; 
          }
        }
      `}</style>
    </div>
  );
}