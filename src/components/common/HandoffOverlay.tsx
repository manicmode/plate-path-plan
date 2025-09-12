import MagicOrb from "@/components/common/MagicOrb";
import { motion } from "framer-motion";

export function HandoffOverlay({
  active,
  message = "Preparing nutrition…",
  sub = "Fetching ingredients & macros",
}: { active: boolean; message?: string; sub?: string }) {
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 backdrop-blur-sm"
    >
      {/* soft background glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-cyan-500/10 via-sky-500/10 to-fuchsia-500/10 blur-3xl"
      />

      {/* card */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="relative rounded-2xl px-5 py-4 bg-zinc-900/90 border border-white/10 shadow-2xl"
      >
        <div className="mx-auto my-2 grid place-items-center">
          <MagicOrb size={48} speedSec={3.2} />
        </div>

        <div className="text-sm leading-tight">
          <div className="font-semibold text-white">{message}</div>
          <div className="text-white/70">{sub}</div>
        </div>
      </motion.div>
    </div>
  );
}