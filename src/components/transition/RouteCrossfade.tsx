import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

type Props = {
  showOverlay: boolean;      // true while fetching/report not ready
  children: React.ReactNode; // the incoming page (Health Report)
};

const DURATION = 0.28;
const MIN_SPINNER_MS = 700;

export function RouteCrossfade({ showOverlay, children }: Props) {
  const [keepSpinner, setKeepSpinner] = React.useState(showOverlay);
  const startAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (showOverlay) {
      setKeepSpinner(true);
      startAt.current = performance.now();
      return;
    }
    // enforce minimum spinner duration to prevent flicker
    const elapsed = startAt.current ? performance.now() - startAt.current : 0;
    const wait = Math.max(0, MIN_SPINNER_MS - elapsed);
    const t = setTimeout(() => setKeepSpinner(false), wait);
    return () => clearTimeout(t);
  }, [showOverlay]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="relative">
      {/* Incoming Page */}
      <AnimatePresence initial={false}>
        <motion.div
          key="page"
          initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {keepSpinner && (
          <motion.div
            key="overlay"
            className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.32)] backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : DURATION }}
            aria-label="Loading health report"
          >
            <div className="pointer-events-auto rounded-xl bg-[#10161d] px-4 py-3 shadow-lg">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-t-transparent mx-auto" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}