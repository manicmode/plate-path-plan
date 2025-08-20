import { motion } from 'framer-motion';
import { Info, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface HabitTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  domain: 'nutrition' | 'exercise' | 'recovery';
  difficulty: string;
  category: string;
  score?: number;
  reasons?: string[];
}

interface CarouselHabitCardProps {
  habit: HabitTemplate;
  isAdded?: boolean;
  onInfo: () => void;
  onAdd: () => void;
  onWhyThis?: () => void;
  index: number;
}

const DOMAIN_EMOJIS = {
  nutrition: '🥗',
  exercise: '💪',
  recovery: '🧘'
};

const DOMAIN_GRADIENTS = {
  nutrition: 'from-emerald-400/30 to-lime-400/20',
  exercise: 'from-cyan-400/30 to-blue-400/20',
  recovery: 'from-violet-400/30 to-indigo-400/20'
};

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function CarouselHabitCard({ habit, isAdded, onInfo, onAdd, onWhyThis, index }: CarouselHabitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: index * 0.03 }}
      className="min-w-[76%] sm:min-w-[56%] md:min-w-[40%] flex-shrink-0 snap-center"
    >
      <div className={cn(
        "rounded-2xl bg-background/40 backdrop-blur-xl ring-1 ring-border",
        "hover:ring-primary/50 transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/10",
        "p-4 h-full flex flex-col group relative"
      )}>
        {/* Gradient background */}
        <div className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity",
          DOMAIN_GRADIENTS[habit.domain]
        )} />
        
        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl flex-shrink-0">
              {DOMAIN_EMOJIS[habit.domain]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base line-clamp-2 mb-1">
                {habit.title}
              </h3>
              <Badge 
                className={cn("text-xs", getDifficultyColor(habit.difficulty))}
              >
                {habit.difficulty}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-2 flex-1">
            {habit.description}
          </p>

          {/* Suggestion reason (if available) */}
          {habit.reasons && habit.reasons.length > 0 && (
            <div className="mb-3 space-y-1">
              <p className="text-xs text-muted-foreground/70 line-clamp-1">
                Suggested because: {habit.reasons[0].replace(/🎯|⚖️|🚀|🔁|☀️|🧩|⭐/g, '').replace(/\*\*/g, '').trim()}
              </p>
              {onWhyThis && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onWhyThis();
                  }}
                  className="text-xs text-primary/70 hover:text-primary underline"
                >
                  Why this? →
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInfo?.();
              }}
              className="flex-1 h-9 text-xs"
            >
              <Info className="h-3 w-3 mr-1" />
              Info
            </Button>
            
            {isAdded ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="flex-1 h-9 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Added ✓
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd?.();
                }}
                className="flex-1 h-9 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}