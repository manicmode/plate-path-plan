import * as React from 'react';

/**
 * Wordless, eye-candy loader for ~1s waits.
 * - No hooks.
 * - One overlay, no text.
 * - Respects prefers-reduced-motion.
 */
export default function ConfirmLoaderMinimal() {
  return (
    <div
      className="fixed z-[600] bg-black/85 backdrop-blur-2xl flex items-center justify-center"
      style={{
        // Ensure complete coverage including areas above safe zones
        top: 'calc(-1 * max(env(safe-area-inset-top), 44px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom))',
        left: 'calc(-1 * env(safe-area-inset-left))',
        right: 'calc(-1 * env(safe-area-inset-right))',
        paddingTop: 'max(env(safe-area-inset-top), 44px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="clm-title"
      aria-describedby="clm-desc"
    >
      {/* Visually hidden, for screen readers only */}
      <span id="clm-title" className="sr-only">Loading</span>
      <span id="clm-desc" className="sr-only">Preparing your item</span>

      {/* Animation container */}
      <div className="relative w-[120px] h-[120px] md:w-[140px] md:h-[140px]">
        {/* Soft glass card */}
        <div className="absolute inset-0 rounded-3xl bg-background/90 backdrop-blur-2xl border shadow-xl" />

        {/* Glow orb */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative">
            <div className="size-20 md:size-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),rgba(255,255,255,0.15)_60%,rgba(0,0,0,0)_61%)]" />
            {/* rotating gradient ring */}
            <div className="absolute inset-[-6px] rounded-full opacity-90
                            bg-[conic-gradient(from_0deg,theme(colors.primary.DEFAULT),transparent_60%,theme(colors.primary.DEFAULT))]
                            animate-[spin_1.2s_linear_infinite]"
                 aria-hidden="true" />
            {/* inner glow pulse */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-[pulseGlow_1.6s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Orbiting dots */}
        <div className="absolute inset-0">
          <span className="absolute left-1/2 top-0 -ml-1 size-2 rounded-full bg-primary/90 animate-[orbit_1.8s_linear_infinite]" />
          <span className="absolute left-0 top-1/2 -mt-1 size-2 rounded-full bg-primary/60 animate-[orbit_1.8s_linear_infinite] [animation-delay:.2s]" />
          <span className="absolute left-1/2 bottom-0 -ml-1 size-2 rounded-full bg-primary/60 animate-[orbit_1.8s_linear_infinite] [animation-delay:.4s]" />
          <span className="absolute right-0 top-1/2 -mt-1 size-2 rounded-full bg-primary/90 animate-[orbit_1.8s_linear_infinite] [animation-delay:.6s]" />
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-[spin_1.2s_linear_infinite],
          .animate-[pulseGlow_1.6s_ease-in-out_infinite],
          .animate-[orbit_1.8s_linear_infinite] { animation: none !important; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .6; transform: scale(1.05); }
        }
        @keyframes orbit {
          0%   { transform: rotate(0deg) translateX(52px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}