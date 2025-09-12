import { motion } from "framer-motion";

type Props = {
  size?: number;               // px
  speedSec?: number;           // rotation duration
  primary?: string;            // main glow color
  secondary?: string;          // accent color
  className?: string;          // extra classes
};

export default function MagicOrb({
  size = 160,
  speedSec = 3.2,
  primary = "rgb(34, 211, 238)",     // cyan-400
  secondary = "rgb(16, 185, 129)",   // emerald-500
  className = "",
}: Props) {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-emerald-400/20 blur-xl animate-pulse" />
      
      {/* Outer circle - largest, slowest */}
      <motion.div 
        className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-cyan-400/40 via-emerald-400/40 to-cyan-400/40 bg-clip-border"
        style={{
          background: 'conic-gradient(from 0deg, rgba(34, 211, 238, 0.4), rgba(16, 185, 129, 0.4), rgba(34, 211, 238, 0.4))',
          borderRadius: '50%',
          padding: '2px'
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-full h-full rounded-full bg-slate-900/50 backdrop-blur-sm" />
      </motion.div>
      
      {/* Middle circle - medium size, medium speed */}
      <motion.div 
        className="absolute rounded-full border-3 border-transparent"
        style={{
          inset: size * 0.15,
          background: 'conic-gradient(from 180deg, rgba(16, 185, 129, 0.6), rgba(34, 211, 238, 0.6), rgba(16, 185, 129, 0.6))',
          borderRadius: '50%',
          padding: '2px'
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-full h-full rounded-full bg-slate-900/30 backdrop-blur-sm" />
      </motion.div>
      
      {/* Inner circle - smallest, fastest */}
      <motion.div 
        className="absolute rounded-full border-2 border-transparent"
        style={{
          inset: size * 0.3,
          background: 'conic-gradient(from 90deg, rgba(34, 211, 238, 0.8), rgba(16, 185, 129, 0.8), rgba(34, 211, 238, 0.8))',
          borderRadius: '50%',
          padding: '1px'
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-full h-full rounded-full bg-slate-900/20 backdrop-blur-sm" />
      </motion.div>

      {/* Central pulsing core */}
      <motion.div 
        className="absolute rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
        style={{ inset: size * 0.4 }}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
      />
    </div>
  );
}