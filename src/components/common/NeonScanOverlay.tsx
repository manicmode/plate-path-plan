import React from 'react';

export default function NeonScanOverlay({ label = 'Finding your food…' }: { label?: string }) {
  return (
    <div className="fixed z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-2xl"
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
         }}>
      <div className="relative flex flex-col items-center gap-4">
        {/* Glow core */}
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-70"
               style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,255,255,.6), rgba(0,0,0,0))' }} />
          {/* Concentric rings */}
          <div className="absolute inset-0 rounded-full border border-cyan-300/40 animate-[spin_6s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-blue-300/40 animate-[spin_8s_linear_infinite_reverse]" />
          <div className="absolute inset-4 rounded-full border border-violet-300/40 animate-[spin_10s_linear_infinite]" />
          {/* Sweeping scan line */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-full"
                 style={{ background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)' }} />
          </div>
        </div>
        <div className="px-3 py-1 text-sm text-white/90 rounded-full bg-black/50 border border-white/10">
          {label}
        </div>
      </div>
    </div>
  );
}