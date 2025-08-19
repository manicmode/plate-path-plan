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
      className="min-w-[320px] sm:min-w-[280px] flex-shrink-0 snap-center"
    >
      <div className={cn(
        "relative rounded-3xl backdrop-blur-xl border-2 transition-all duration-300",
        "hover:shadow-2xl group overflow-hidden",
        "bg-background/60",
        DOMAIN_BORDERS[habit.domain],
        DOMAIN_SHADOWS[habit.domain]
      )}>
        {/* Animated gradient background */}
        <div className={cn(
          "absolute inset-0 rounded-3xl bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity duration-300",
          DOMAIN_GRADIENTS[habit.domain]
        )} />
        
        {/* Sparkle effect on hover */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Star className="h-4 w-4 text-yellow-400 animate-pulse" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
              {DOMAIN_EMOJIS[habit.domain]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {habit.title}
              </h3>
              <Badge 
                className={cn(
                  "text-xs font-medium border shadow-sm",
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onInfo}
              className="flex-1 h-10 text-sm backdrop-blur-sm bg-background/50 hover:bg-background/80 border-border/50 hover:border-border transition-all duration-200"
            >
              <Info className="h-4 w-4 mr-2" />
              Learn More
            </Button>
            
            {isAdded ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-1 h-10 text-sm bg-emerald-50/50 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800/50 dark:text-emerald-300"
              >
                <Check className="h-4 w-4 mr-2" />
                Added ✓
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onAdd}
                className={cn(
                  "flex-1 h-10 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200",
                  habit.domain === 'nutrition' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                  habit.domain === 'exercise' && "bg-orange-600 hover:bg-orange-700 text-white",
                  habit.domain === 'recovery' && "bg-purple-600 hover:bg-purple-700 text-white"
                )}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Habit
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}