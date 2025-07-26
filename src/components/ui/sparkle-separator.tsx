import React from 'react';
import { Sparkles } from 'lucide-react';

interface SparkleSeparatorProps {
  variant?: 'teal' | 'purple';
  className?: string;
}

export const SparkleSeparator: React.FC<SparkleSeparatorProps> = ({ 
  variant = 'teal', 
  className = '' 
}) => {
  const sparkleColors = {
    teal: 'text-teal-400',
    purple: 'text-purple-400'
  };

  const glowColors = {
    teal: 'drop-shadow-[0_0_8px_rgba(20,184,166,0.6)]',
    purple: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]'
  };

  return (
    <div className={`relative flex items-center justify-center my-8 ${className}`}>
      {/* Left line */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border/50" />
      
      {/* Center sparkle icon */}
      <div className="relative px-4">
        <div className={`
          p-2 rounded-full 
          bg-background/80 backdrop-blur-sm 
          border border-border/50 
          ${glowColors[variant]}
          animate-pulse
        `}>
          <Sparkles 
            className={`
              w-5 h-5 
              ${sparkleColors[variant]} 
              ${glowColors[variant]}
            `} 
          />
        </div>
      </div>
      
      {/* Right line */}
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border/50" />
    </div>
  );
};