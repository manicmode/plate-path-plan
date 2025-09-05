import * as React from 'react';

export function ModalOverlay({ className = '' }: { className?: string }) {
  // One overlay to rule them all: dim + blur, PWA/iOS safe
  // FIXED: pointer-events-none so clicks pass through to content
  return (
    <div
      className={[
        // FULL-screen layer including safe areas
        'fixed inset-0 z-[60] pointer-events-none',
        // Cover everything including status bar areas
        'top-0 left-0 right-0 bottom-0',
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
        // Ensure we cover everything including safe areas
        marginTop: 'calc(-1 * env(safe-area-inset-top))',
        marginBottom: 'calc(-1 * env(safe-area-inset-bottom))',
        marginLeft: 'calc(-1 * env(safe-area-inset-left))',
        marginRight: 'calc(-1 * env(safe-area-inset-right))',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    />
  );
}