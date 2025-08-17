import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const QUICK = ["🔥","💪","🎯","👏","😍","😮","😂","🫡","🥇","🥈","🥉"];
const GRID = ["🔥","💪","🎯","👏","😍","😮","😂","🥳","🤝","⚡","🧠","🌟","🍀","🧊","🛡️","🦾","🧗","🏃","🚴","🏋️","🥗","💧","😴","📈","💯","⭐"];

type Props = {
  open: boolean;
  onToggle: () => void;
  onReact: (emoji: string) => void;
  className?: string;
};

export default function EmojiTray({ open, onToggle, onReact, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Prevent scroll bleed when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const containerStyles = "fixed bottom-0 left-0 right-0 z-40 sm:max-w-xl sm:left-1/2 sm:-translate-x-1/2";
  const cardStyles = "rounded-t-3xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-2xl";

  const quick = useMemo(() => QUICK, []);
  const grid = useMemo(() => GRID, []);

  return (
    <>
      {/* Floating + tab */}
      <button
        aria-label="Toggle emoji tray"
        onClick={onToggle}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur hover:bg-white/20 transition"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={`${containerStyles} ${className ?? ""}`}
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 280 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120) onToggle();
              }}
              className={`${cardStyles} mx-3`}
              ref={constraintsRef}
            >
              {/* drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/30" />
              </div>

              {/* quick row */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-white/60">Quick Reactions</div>
                  <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-xs text-white/70 hover:text-white"
                  >
                    {expanded ? "Less" : "More"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quick.map(e => (
                    <button
                      key={e}
                      onClick={() => onReact(e)}
                      className="rounded-2xl bg-white/10 px-3 py-1.5 text-lg ring-1 ring-white/10 hover:bg-white/20 transition"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* grid */}
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <div className="grid grid-cols-8 gap-2">
                      {grid.map(e => (
                        <button
                          key={e}
                          onClick={() => onReact(e)}
                          className="rounded-xl bg-white/10 py-2 text-lg ring-1 ring-white/10 hover:bg-white/20 transition"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}