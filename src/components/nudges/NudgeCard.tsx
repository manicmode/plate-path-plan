import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type NudgeCardProps = {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
  cta?: { 
    label: string; 
    onClick: () => void; 
    icon?: ReactNode;
  };
  tone?: 'primary' | 'success' | 'calm' | 'warn';
  onDismiss?: () => void;
  className?: string;
};

export function NudgeCard({
  title,
  icon,
  children,
  cta,
  tone = 'primary',
  onDismiss,
  className,
}: NudgeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        // Container - Light mode
        "relative rounded-2xl p-4 sm:p-5",
        "bg-white/85 backdrop-blur-xl",
        "border border-slate-200/80",
        "shadow-[0_12px_30px_-12px_rgba(2,6,23,0.18)]",
        "ring-1 ring-slate-900/5",
        // Container - Dark mode  
        "dark:bg-slate-900/70 dark:backdrop-blur-xl",
        "dark:border dark:border-white/10",
        "dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.55)]",
        "dark:ring-1 dark:ring-white/10",
        // Accent glow
        "before:content-[''] before:absolute before:-top-6 before:-left-6 before:h-24 before:w-24",
        "before:rounded-full before:blur-2xl before:pointer-events-none",
        "before:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.16),transparent_60%)]",
        "dark:before:bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.35),transparent_60%)]",
        className
      )}
      role="region"
      aria-label={`${title} nudge card`}
    >
      <div className="relative z-10">
        {/* Header row: icon chip + title + dismiss */}
        <div className="flex items-start gap-3 mb-3">
          {icon && (
            <div 
              className={cn(
                "h-9 w-9 shrink-0 rounded-xl flex items-center justify-center",
                "bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white",
                "shadow-[0_8px_18px_-6px_rgba(99,102,241,0.55)]"
              )}
              aria-label="Nudge type icon"
            >
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-lg leading-tight"
              role="heading"
              aria-level={3}
            >
              {title}
            </h3>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className={cn(
                "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center",
                "bg-slate-900/5 dark:bg-white/5",
                "text-slate-600 dark:text-slate-300",
                "hover:bg-slate-900/10 dark:hover:bg-white/10",
                "transition-colors"
              )}
              aria-label="Dismiss nudge"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body content */}
        {children && (
          <div className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
            {children}
          </div>
        )}

        {/* Action buttons */}
        {cta && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={cta.onClick}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 min-h-[44px]",
                "bg-gradient-to-tr from-indigo-500 to-violet-500",
                "text-white font-medium shadow-[0_10px_24px_-10px_rgba(99,102,241,0.65)]",
                "hover:opacity-95 active:scale-[0.99] transition-all duration-150"
              )}
              aria-label={`${cta.label} action`}
            >
              {cta.icon}
              {cta.label}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}