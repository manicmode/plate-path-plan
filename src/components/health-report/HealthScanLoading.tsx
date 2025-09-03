import React from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface HealthScanLoadingProps {
  isOpen: boolean;
}

export const HealthScanLoading: React.FC<HealthScanLoadingProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] bg-gradient-to-br from-red-900/90 via-purple-900/90 to-red-800/90 backdrop-blur-sm flex items-center justify-center"
      style={{ overflow: 'hidden' }}
      role="status"
      aria-live="polite"
    >
      <VisuallyHidden>Analyzing your meal...</VisuallyHidden>
      
      <div className="text-center space-y-6 px-6">
        {/* Animated heart/ECG pulse */}
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            {/* Outer pulse ring */}
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse delay-75"></div>
            
            {/* Center heart */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl animate-pulse">❤️</div>
            </div>
          </div>
          
          {/* ECG line animation */}
          <div className="relative h-1 w-32 mx-auto bg-red-900/30 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400 to-transparent w-8 animate-pulse"></div>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-4 rounded-full"
              style={{
                animation: 'slide-pulse 2s ease-in-out infinite'
              }}
            ></div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">Analyzing your meal...</h3>
          <p className="text-red-200/80 text-sm">
            Using AI to detect nutritional information
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-pulse {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(400%); opacity: 1; }
          100% { transform: translateX(500%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};