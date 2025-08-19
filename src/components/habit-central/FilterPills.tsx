import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FilterPillsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  layoutId?: string;
  className?: string;
}

export function FilterPills({ options, selected, onSelect, layoutId, className }: FilterPillsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={cn(
            "relative px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            selected === option
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {selected === option && (
            <motion.div
              layoutId={layoutId || "filter-active"}
              className="absolute inset-0 bg-primary rounded-full"
              initial={false}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{option}</span>
        </button>
      ))}
    </div>
  );
}