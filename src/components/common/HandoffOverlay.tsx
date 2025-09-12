import { Loader2 } from "lucide-react";

export function HandoffOverlay({
  active,
  message = "Preparing nutrition…",
}: { active: boolean; message?: string }) {
  if (!active) return null;
  
  return (
    <div
      aria-live="polite"
      role="status"
      aria-busy="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="rounded-2xl px-5 py-4 bg-zinc-900/80 border border-white/10 shadow-2xl flex items-center gap-3 animate-scale-in">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="text-sm">
          <div className="font-medium text-foreground">Preparing nutrition…</div>
          <div className="opacity-70 text-muted-foreground">Fetching ingredients & macros</div>
        </div>
      </div>
    </div>
  );
}