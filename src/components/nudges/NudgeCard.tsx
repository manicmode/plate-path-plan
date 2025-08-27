import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';

type NudgeCardProps = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: ReactNode;
  accent?: 'breath' | 'hydrate' | 'move' | 'sleep' | 'generic';
  variant?: 'glass' | 'solid';
  className?: string;
  footer?: ReactNode;
};

const accentVars = {
  breath: { '--nudge-a-from': '#22d3ee80', '--nudge-a-to': '#a78bfa80' }, // cyan → violet
  hydrate: { '--nudge-a-from': '#60a5fa80', '--nudge-a-to': '#34d39980' }, // blue → emerald
  move: { '--nudge-a-from': '#f472b680', '--nudge-a-to': '#fb923c80' }, // pink → orange
  sleep: { '--nudge-a-from': '#818cf880', '--nudge-a-to': '#06b6d480' }, // indigo → cyan
  generic: { '--nudge-a-from': '#94a3b880', '--nudge-a-to': '#a7f3d080' },
} as const;

export function NudgeCard({
  title,
  subtitle,
  ctaLabel,
  onCta,
  icon,
  accent = 'generic',
  variant = 'glass',
  className,
  footer,
}: NudgeCardProps) {
  const isGlass = variant === 'glass';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative rounded-3xl p-4 md:p-5",
        isGlass 
          ? "backdrop-blur-xl bg-white/8 dark:bg-white/6 ring-1 ring-white/15 shadow-xl shadow-black/20"
          : "bg-gradient-to-br from-primary to-primary-foreground shadow-lg",
        "before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/15 before:to-transparent before:pointer-events-none",
        "after:absolute after:-inset-px after:rounded-3xl after:bg-gradient-to-r after:from-[var(--nudge-a-from)] after:to-[var(--nudge-a-to)] after:opacity-30 after:blur-xl after:-z-10",
        "hover:scale-[1.01] transition-transform duration-200",
        className
      )}
      style={accentVars[accent] as React.CSSProperties}
      role="region"
      aria-label={`${title} nudge card`}
    >
      <div className="relative z-10">
        {/* Header with icon and title */}
        <div className="flex items-start gap-4 mb-3">
          {icon && (
            <div 
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 flex-shrink-0"
              aria-label="Nudge type icon"
            >
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-lg text-white/90 leading-tight"
              role="heading"
              aria-level={3}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-white/70 text-sm mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {(ctaLabel || footer) && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {ctaLabel && onCta && (
              <button
                onClick={onCta}
                className={cn(
                  "mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                  "bg-white/15 hover:bg-white/20 ring-1 ring-white/20 shadow-lg shadow-black/10",
                  "transition-all duration-200 text-white/90",
                  "[text-shadow:0_1px_0_rgba(0,0,0,.15)]",
                  "hover:shadow-2xl hover:shadow-current/25"
                )}
                aria-label={`${ctaLabel} action`}
              >
                {accent === 'breath' && <Heart className="h-4 w-4" />}
                {ctaLabel}
              </button>
            )}
            
            {footer && (
              <div className="flex-1 sm:flex-none">
                {footer}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}