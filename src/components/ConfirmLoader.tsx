import * as React from 'react';
import { Loader2 } from 'lucide-react';

type ConfirmLoaderProps = {
  title?: string;
  subtitle?: string;
  itemName?: string | null;
};

export default function ConfirmLoader({
  title = 'Preparing nutrition details…',
  subtitle = 'Hang tight while we analyze this item.',
  itemName,
}: ConfirmLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-[600] bg-black/45 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-loader-title"
      aria-describedby="confirm-loader-desc"
    >
      <div className="bg-background border rounded-2xl shadow-xl w-[min(520px,92vw)] p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-loader-title" className="text-base md:text-lg font-semibold truncate">
              {title}
            </h2>
            <p id="confirm-loader-desc" className="text-xs md:text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Item chip */}
        {itemName ? (
          <div className="mt-4">
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs md:text-sm">
              Analyzing: <span className="ml-1 font-medium truncate max-w-[16ch]">{itemName}</span>
            </span>
          </div>
        ) : null}

        {/* Skeleton content */}
        <div className="mt-5 space-y-4">
          <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded bg-muted animate-pulse" />
            <div className="h-16 rounded bg-muted animate-pulse" />
            <div className="h-16 rounded bg-muted animate-pulse" />
          </div>
          {/* Progress bar (cosmetic) */}
          <div className="mt-2">
            <div className="h-2 w-full rounded bg-muted overflow-hidden">
              <div className="h-full w-1/3 animate-[loader_1.2s_ease-in-out_infinite] bg-foreground/70" />
            </div>
          </div>
        </div>

        {/* Micro copy */}
        <div className="mt-4 text-[11px] md:text-xs text-muted-foreground">
          This step prevents incorrect macros from flashing on screen.
        </div>
      </div>

      {/* keyframes (scoped via tailwind arbitrary) */}
      <style>{`
        @keyframes loader {
          0% { transform: translateX(-60%); }
          50% { transform: translateX(15%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}