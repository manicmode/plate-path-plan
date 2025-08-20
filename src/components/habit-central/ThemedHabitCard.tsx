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
      className="w-[92%] max-w-[420px] mx-auto shrink-0 snap-center"
    >
      <div className={cn(
        "relative rounded-2xl p-4 sm:p-5 md:p-6 overflow-hidden h-[320px]",
        "bg-slate-900/60 backdrop-blur-xl border transition-all duration-300",
        "hover:shadow-2xl group",
        habit.domain === 'nutrition' && "border-emerald-400/20 shadow-[0_10px_40px_rgba(16,185,129,.25)]",
        habit.domain === 'exercise' && "border-amber-400/20 shadow-[0_10px_40px_rgba(245,158,11,.25)]", 
        habit.domain === 'recovery' && "border-violet-400/20 shadow-[0_10px_40px_rgba(139,92,246,.25)]"
      )}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        {/* Sparkle effect on hover */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Star className="h-4 w-4 text-yellow-400 animate-pulse" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl flex-shrink-0">
              {DOMAIN_EMOJIS[habit.domain]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight mb-2 line-clamp-2">
                {habit.title}
              </h3>
              <Badge 
                className={cn(
                  "text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15",
                  getDifficultyColor(habit.difficulty)
                )}
              >
                {habit.difficulty}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-white/80 line-clamp-3 mb-4 flex-1">
            {habit.description}
          </p>

          {/* Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              size="default"
              onClick={onInfo}
              className="h-11 text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl"
            >
              <Info className="h-4 w-4 mr-2" />
              Learn More
            </Button>
            
            {isAdded ? (
              <Button
                variant="outline"
                size="default"
                disabled
                className="h-11 text-base font-medium bg-emerald-50/80 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800/50 dark:text-emerald-300 rounded-xl sm:col-span-2"
              >
                <Check className="h-5 w-5 mr-2" />
                Added ✓
              </Button>
            ) : (
              <Button
                size="default"
                onClick={onAdd}
                className={cn(
                  "h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl sm:col-span-2",
                  habit.domain === 'nutrition' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                  habit.domain === 'exercise' && "bg-orange-600 hover:bg-orange-700 text-white", 
                  habit.domain === 'recovery' && "bg-purple-600 hover:bg-purple-700 text-white"
                )}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Habit
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}