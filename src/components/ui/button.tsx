import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground glass-button",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md hover:shadow-lg",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-10 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Fix double-tap issues by ensuring proper touch and click handling
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (props.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Prevent default to avoid iOS double-tap issues
      e.preventDefault();
      props.onClick?.(e);
    }, [props.disabled, props.onClick]);

    // Prevent touch events from interfering with click
    const handleTouchStart = React.useCallback((e: React.TouchEvent<HTMLButtonElement>) => {
      if (props.disabled) {
        e.preventDefault();
        return;
      }
      props.onTouchStart?.(e);
    }, [props.disabled, props.onTouchStart]);

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          {...(({ onClick, onTouchStart, ...rest }) => rest)(props)}
          ref={ref}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          style={{ 
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            ...props.style 
          }}
        />
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(({ onClick, onTouchStart, ...rest }) => rest)(props)}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        style={{ 
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          ...props.style 
        }}
      />
    );
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }