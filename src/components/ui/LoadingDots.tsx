import React from 'react';

export default function LoadingDots({ label = 'Loading…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm opacity-90">
      <span role="status" aria-live="polite">{label}</span>
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-.2s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-.1s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
      </span>
    </span>
  );
}