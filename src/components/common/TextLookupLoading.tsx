import React from 'react';
import { Loader2 } from 'lucide-react';

export default function TextLookupLoading({ label = 'Finding your food…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-2xl bg-black/75"
         style={{
           top: 'calc(-1 * env(safe-area-inset-top))',
           bottom: 'calc(-1 * env(safe-area-inset-bottom))',
           left: 'calc(-1 * env(safe-area-inset-left))',
           right: 'calc(-1 * env(safe-area-inset-right))',
           paddingTop: 'env(safe-area-inset-top)',
           paddingBottom: 'env(safe-area-inset-bottom)',
           paddingLeft: 'env(safe-area-inset-left)',
           paddingRight: 'env(safe-area-inset-right)',
         }}>
      <div className="rounded-2xl p-6 bg-black/60 text-white shadow-xl flex flex-col items-center gap-3">
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <div className="text-sm opacity-80 text-center max-w-xs">{label}</div>
      </div>
    </div>
  );
}