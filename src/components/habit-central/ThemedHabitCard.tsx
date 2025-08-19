import { motion } from 'framer-motion';
import { Info, Plus, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HabitTemplate } from './CarouselHabitCard';

interface ThemedHabitCardProps {
  habit: HabitTemplate;
  isAdded?: boolean;
  onInfo: () => void;
  onAdd: () => void;
  index: number;
}

const DOMAIN_EMOJIS = {
  nutrition: '🥗',
  exercise: '💪',
  recovery: '🧘'
};

const DOMAIN_GRADIENTS = {
  nutrition: 'from-emerald-500/20 via-green-500/15 to-lime-500/20',
  exercise: 'from-orange-500/20 via-red-500/15 to-pink-500/20',
  recovery: 'from-purple-500/20 via-violet-500/15 to-indigo-500/20'
};

const DOMAIN_BORDERS = {
  nutrition: 'border-emerald-500/30 hover:border-emerald-400/50',
  exercise: 'border-orange-500/30 hover:border-orange-400/50',
  recovery: 'border-purple-500/30 hover:border-purple-400/50'
};

const DOMAIN_SHADOWS = {
  nutrition: 'hover:shadow-emerald-500/20',
  exercise: 'hover:shadow-orange-500/20',
  recovery: 'hover:shadow-purple-500/20'
};

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'bg-emerald-100/80 text-emerald-700 border-emerald-300/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50';
    case 'medium': return 'bg-amber-100/80 text-amber-700 border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50';
    case 'hard': return 'bg-red-100/80 text-red-700 border-red-300/50 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50';
    default: return 'bg-muted/80 text-muted-foreground border-border';
  }
}

export function ThemedHabitCard({ habit, isAdded, onInfo, onAdd, index }: ThemedHabitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.08,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="w-full min-w-0"
    >
      <div className={cn(
        "w-full rounded-2xl p-4 sm:p-5 min-h-[220px] sm:min-h-[240px]",
        "bg-gradient-to-br from-white/6 via-white/4 to-white/2",
        "dark:from-black/30 dark:via-black/20 dark:to-black/10",
        "border border-white/10 backdrop-blur-xl",
        "before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none before:ring-1 before:ring-white/10",
        "transition-all duration-300 hover:shadow-lg group relative"
      )}>
        {/* Animated gradient background */}
        <div className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity duration-300",
          DOMAIN_GRADIENTS[habit.domain]
        )} />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              {DOMAIN_EMOJIS[habit.domain]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {habit.title}
              </h3>
              <Badge 
                className={cn(
                  "px-2 py-1 rounded-full text-[11px] bg-white/10 border border-white/15",
                  getDifficultyColor(habit.difficulty)
                )}
              >
                {habit.difficulty}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 leading-relaxed">
            {habit.description}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="default"
              onClick={onInfo}
              className="w-full h-11 rounded-xl border border-white/15 bg-white/5 text-sm font-medium hover:bg-white/10 transition-all duration-200"
            >
              <Info className="h-4 w-4 mr-2" />
              ℹ Learn More
            </Button>
            
            {isAdded ? (
              <Button
                variant="outline"
                size="default"
                disabled
                className="w-full h-11 rounded-xl bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800/50 dark:text-emerald-300"
              >
                <Check className="h-4 w-4 mr-2" />
                Added ✓
              </Button>
            ) : (
              <Button
                size="default"
                onClick={onAdd}
                className={cn(
                  "w-full h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/40 text-sm font-semibold transition-all duration-200",
                  "hover:scale-[1.02]"
                )}
              >
                <Plus className="h-4 w-4 mr-2" />
                + Add Habit
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}