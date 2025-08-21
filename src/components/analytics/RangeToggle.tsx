import { motion } from "framer-motion";

interface RangeToggleProps {
  value: '7d' | '30d';
  onChange: (value: '7d' | '30d') => void;
  className?: string;
}

export const RangeToggle = ({ value, onChange, className = "" }: RangeToggleProps) => {
  return (
    <div className={`flex gap-1 p-1 bg-muted/20 rounded-lg ${className}`}>
      <motion.button
        onClick={() => onChange('7d')}
        className={`px-3 py-1 text-xs rounded transition-colors relative ${
          value === '7d' 
            ? 'text-primary-foreground' 
            : 'text-muted-foreground hover:text-foreground'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        {value === '7d' && (
          <motion.div
            layoutId="range-toggle-bg"
            className="absolute inset-0 bg-primary rounded"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">7 Days</span>
      </motion.button>
      
      <motion.button
        onClick={() => onChange('30d')}
        className={`px-3 py-1 text-xs rounded transition-colors relative ${
          value === '30d' 
            ? 'text-primary-foreground' 
            : 'text-muted-foreground hover:text-foreground'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        {value === '30d' && (
          <motion.div
            layoutId="range-toggle-bg"
            className="absolute inset-0 bg-primary rounded"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">30 Days</span>
      </motion.button>
    </div>
  );
};