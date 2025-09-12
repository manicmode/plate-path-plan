import { motion } from "framer-motion";
import MagicOrb from "@/components/common/MagicOrb";

export default function MagicHandoffOverlay({
  active,
  title = "Preparing nutrition…",
  subtitle = "Fetching ingredients & macros",
}: { active: boolean; title?: string; subtitle?: string }) {
  if (!active) return null;
  
  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-busy="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/65 backdrop-blur-sm"
    >
      {/* ambient glow */}
      <motion.div
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute w-[44rem] h-[44rem] rounded-full bg-gradient-to-br from-cyan-500/16 via-sky-500/12 to-fuchsia-500/8 blur-3xl"
      />
      
      {/* orb and content */}
      <motion.div 
        initial={{ scale: 0.96, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="grid place-items-center gap-4"
      >
        <MagicOrb size={120} speedSec={3.0} />
        <div className="text-center">
          <div className="text-white text-sm font-semibold">{title}</div>
          <div className="text-white/75 text-xs">{subtitle}</div>
        </div>
      </motion.div>
    </div>
  );
}