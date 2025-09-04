import * as React from "react";
import { cn } from "@/lib/utils";

type PhaseKey =
  | "uploading"
  | "preprocessing"
  | "detecting"
  | "hydrating"
  | "buildingReview";

const DEFAULT_PHASE_WEIGHTS: Record<PhaseKey, number> = {
  uploading: 0.15,
  preprocessing: 0.15,
  detecting: 0.35,
  hydrating: 0.20,
  buildingReview: 0.15,
};

const TIPS = [
  "Pro tip: Clear lighting helps detection.",
  "You can refine items in the next step.",
  "Tap Skip during confirm to move faster.",
  "We use per-gram data for accuracy.",
  "Hold the phone steady for sharper shots.",
];

export type SmartAnalyzeLoaderProps = {
  /** Set by the pipeline; if omitted we'll simulate optimistic progress */
  phase?: PhaseKey;
  /** When true, instantly completes to 100% and fades out */
  done?: boolean;
  /** Abort handler (Cancel button) */
  onCancel?: () => void;
  /** Optional text overrides */
  title?: string;
  subtitle?: string;
  /** Allow custom phase labels */
  labels?: Partial<Record<PhaseKey, string>>;
  /** For users w/ reduced motion, we'll dial animations down */
  reduceMotion?: boolean;
};

export function SmartAnalyzeLoader({
  phase,
  done = false,
  onCancel,
  title = "Analyzing your meal…",
  subtitle = "Preparing detection results and nutrition data",
  labels = {},
  reduceMotion,
}: SmartAnalyzeLoaderProps) {
  const [tipIdx, setTipIdx] = React.useState(0);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [softPct, setSoftPct] = React.useState(0);

  // phase → label
  const PHASE_LABELS: Record<PhaseKey, string> = {
    uploading: "Uploading photo",
    preprocessing: "Optimizing image",
    detecting: "Finding foods",
    hydrating: "Loading nutrition",
    buildingReview: "Building review flow",
  };
  const pretty = (key: PhaseKey) => labels[key] ?? PHASE_LABELS[key];

  // optimistic progress: creep toward the cumulative weight of the current or next phase
  const currentPhase: PhaseKey =
    phase ?? (softPct < 0.15 ? "uploading"
      : softPct < 0.30 ? "preprocessing"
      : softPct < 0.65 ? "detecting"
      : softPct < 0.85 ? "hydrating"
      : "buildingReview");

  const targetPct = React.useMemo(() => {
    const weights = DEFAULT_PHASE_WEIGHTS;
    const order: PhaseKey[] = ["uploading","preprocessing","detecting","hydrating","buildingReview"];
    let acc = 0;
    for (const k of order) {
      acc += weights[k];
      if (k === currentPhase) break;
    }
    // stall slightly before the end so we don't "finish" before data is ready
    return Math.min(0.92, acc);
  }, [currentPhase]);

  // animations & timers
  React.useEffect(() => {
    const start = performance.now();
    const tick = () => {
      const t = performance.now() - start;
      setElapsedMs(t);
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  // progress easing toward target
  React.useEffect(() => {
    if (done) {
      setSoftPct(1);
      return;
    }
    const id = setInterval(() => {
      setSoftPct((p) => {
        const delta = Math.max(0.006, (targetPct - p) * 0.12);
        return Math.min(targetPct, p + delta);
      });
    }, 60);
    return () => clearInterval(id);
  }, [targetPct, done]);

  // rotate tips every ~3s
  React.useEffect(() => {
    const id = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.floor(elapsedMs / 1000);
  const showStillWorking = seconds >= 8 && seconds < 12;
  const showSlowNetwork = seconds >= 12 && seconds < 15;
  const showTryAgain = seconds >= 15;

  // prefers-reduced-motion
  const prefersReducedMotion = reduceMotion ?? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="fixed inset-0 z-[760] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-[min(92vw,520px)] rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-5 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        {/* Hero animation */}
        <div className="relative mx-auto mb-5 h-24 w-24">
          {!prefersReducedMotion && (
            <>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/15" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-cyan-400/70 via-teal-300/70 to-blue-500/70 blur-sm" />
              <div className="absolute inset-2 rounded-full bg-background" />
              <div className="absolute inset-6 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-white/70" />
            </>
          )}
          {prefersReducedMotion && (
            <div className="absolute inset-0 rounded-full border-2 border-white/40" />
          )}
        </div>

        {/* Titles */}
        <div className="text-center">
          <div className="text-lg font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm text-white/80">{subtitle}</div>
        </div>

        {/* Phase + progress */}
        <div className="mt-4 rounded-xl bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-white/75">
            <span>{pretty(currentPhase)}</span>
            <span>{Math.round(softPct * 100)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500",
                !done && "animate-[progressGlow_2s_ease-in-out_infinite]"
              )}
              style={{ width: `${Math.round(softPct * 100)}%` }}
            />
          </div>

          {/* ETA & guidance */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/70">
            <span>
              {showStillWorking && "Still working… thanks for your patience."}
              {showSlowNetwork && "This may take a bit longer on slow networks."}
              {showTryAgain && "If this hangs, cancel and try a clearer photo."}
              {!showStillWorking && !showSlowNetwork && !showTryAgain && `~${Math.max(1, 6 - Math.floor(softPct * 6))}s remaining (est.)`}
            </span>
            <span>{seconds}s</span>
          </div>
        </div>

        {/* Tip / rotating message */}
        <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/80">
          {TIPS[tipIdx]}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes progressGlow {
          0%, 100% { filter: drop-shadow(0 0 0.2rem rgba(255,255,255,0.35)); }
          50% { filter: drop-shadow(0 0 0.6rem rgba(59, 222, 255, 0.55)); }
        }
      `}</style>
    </div>
  );
}