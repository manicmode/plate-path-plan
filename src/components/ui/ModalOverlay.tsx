import * as React from 'react';

export function ModalOverlay({ className = '' }: { className?: string }) {
  // One overlay to rule them all: dim + blur, PWA/iOS safe
  // FIXED: pointer-events-none so clicks pass through to content
  return (
    <div
      className={[
        // FULL-screen layer including safe areas
        'fixed z-[60] pointer-events-none',
        // Much stronger dim for the background
        'bg-black/70',
        // STRONGER blur the *backdrop* (content behind)
        'backdrop-blur-xl',
        // iOS Safari PWA needs the prefixed property present in CSS (see globals.css)
        'supports-[backdrop-filter]:backdrop-blur-xl',
        // tiny fade-in
        'animate-in fade-in duration-150',
        className,
      ].join(' ')}
      aria-hidden="true"
      style={{
        // Ensure we cover everything including areas above safe zones
        top: 'calc(-1 * max(env(safe-area-inset-top), 44px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom))',
        left: 'calc(-1 * env(safe-area-inset-left))',
        right: 'calc(-1 * env(safe-area-inset-right))',
        paddingTop: 'max(env(safe-area-inset-top), 44px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    />
  );
}