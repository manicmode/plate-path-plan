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
      {/* glow aura */}
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
        {/* orbital animation */}
        <div className="relative mx-auto my-2 h-12 w-12">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
          />
          {/* small spark */}
          <motion.div
            className="absolute top-1/2 left-1/2 -mt-1 -ml-1 h-2 w-2 rounded-full bg-cyan-300"
            animate={{ x: [16, -16, 16], y: [-16, 16, -16] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
          {/* secondary spark */}
          <motion.div
            className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] h-[6px] w-[6px] rounded-full bg-fuchsia-300/90"
            animate={{ x: [-10, 10, -10], y: [10, -10, 10] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          />
        </div>

        <div className="text-sm leading-tight">
          <div className="font-semibold text-white">{message}</div>
          <div className="text-white/70">{sub}</div>
        </div>
      </motion.div>
    </div>
  );
}