import React from 'react';
import { cn } from '@/lib/utils';

interface TickerProps {
  message: string;
  className?: string;
  speed?: 'slow' | 'normal' | 'fast';
  size?: 'sm' | 'md' | 'lg';
}

export function Ticker({ 
  message, 
  className,
  speed = 'normal',
  size = 'md'
}: TickerProps) {
  const speedClasses = {
    slow: 'animate-marquee-slow',
    normal: 'animate-marquee',
    fast: 'animate-marquee-fast'
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  if (!message) return null;

  return (
    <div className={cn(
      "overflow-hidden whitespace-nowrap bg-gradient-to-r from-transparent via-muted/20 to-transparent py-3",
      className
    )}>
      <div className={cn(
        "inline-flex text-muted-foreground font-medium motion-reduce:animate-none",
        speedClasses[speed],
        sizeClasses[size]
      )}>
        <span className="pr-20">{message}</span>
        <span className="pr-20">{message}</span>
      </div>
    </div>
  );
}