import React from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'ghost' | 'outline';
  disabled?: boolean;
}

/**
 * Optimized close button component that prevents double-click issues
 * and provides consistent behavior across all modals
 */
export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ onClick, className, variant = 'ghost', disabled = false }, ref) => {
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        onClick();
      }
    }, [onClick, disabled]);

    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "absolute top-4 right-4 rounded-full z-10 transition-all duration-200",
          variant === 'ghost' && "hover:bg-muted",
          className
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    );
  }
);

CloseButton.displayName = "CloseButton";