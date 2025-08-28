import * as React from 'react';

export function ModalOverlay({ className = '' }: { className?: string }) {
  // One overlay to rule them all: dim + blur, PWA/iOS safe
  // FIXED: pointer-events-none so clicks pass through to content
  return (
    <div
      className={[
        // full-screen layer
        'fixed inset-0 z-[60] pointer-events-none',
        // dim the background
        'bg-black/40',
        // blur the *backdrop* (content behind)
        'backdrop-blur-md',
        // iOS Safari PWA needs the prefixed property present in CSS (see globals.css)
        'supports-[backdrop-filter]:backdrop-blur-md',
        // tiny fade-in
        'animate-in fade-in duration-150',
        className,
      ].join(' ')}
      aria-hidden="true"
    />
  );
}