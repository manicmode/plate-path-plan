import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StickyHeaderProps {
  children: ReactNode;
  className?: string;
}

export const StickyHeader = ({ children, className }: StickyHeaderProps) => {
  return (
    <div className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      {children}
    </div>
  );
};