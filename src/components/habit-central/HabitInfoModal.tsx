import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Lightbulb, Check, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { HabitTemplate } from './CarouselHabitCard';

interface HabitInfoModalProps {
  habit: HabitTemplate | null;
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  isAdded?: boolean;
}

const DOMAIN_EMOJIS = {
  nutrition: '🥗',
  exercise: '💪',
  recovery: '🧘'
};

function generateHabitInfo(habit: HabitTemplate) {
  // Generate smart content based on habit type
  const domain = habit.domain;
  const title = habit.title.toLowerCase();
  
  // Why it matters (domain-specific benefits)
  let whyPoints: string[] = [];
  if (domain === 'nutrition') {
    whyPoints = [
      'Improves energy levels and mental clarity',
      'Supports long-term health and disease prevention',
      'Enhances physical performance and recovery'
    ];
  } else if (domain === 'exercise') {
    whyPoints = [
      'Strengthens cardiovascular health and endurance',
      'Builds muscle strength and bone density',
      'Reduces stress and improves mental wellbeing'
    ];
  } else {
    whyPoints = [
      'Reduces stress and promotes mental clarity',
      'Improves sleep quality and recovery',
      'Enhances emotional regulation and resilience'
    ];
  }

  // How to do it (actionable steps)
  let howSteps: string[] = [];
  if (title.includes('water') || title.includes('hydration')) {
    howSteps = [
      'Start your day with a glass of water',
      'Set hourly reminders to drink water',
      'Keep a water bottle visible at all times'
    ];
  } else if (title.includes('walk') || title.includes('step')) {
    howSteps = [
      'Take the stairs instead of elevators',
      'Walk during phone calls when possible',
      'Park further away or get off transit early'
    ];
  } else if (title.includes('sleep') || title.includes('rest')) {
    howSteps = [
      'Set a consistent bedtime routine',
      'Avoid screens 1 hour before bed',
      'Create a cool, dark sleeping environment'
    ];
  } else {
    howSteps = [
      'Start with small, manageable amounts',
      'Be consistent with timing each day',
      'Track your progress to stay motivated'
    ];
  }

  // Time estimate based on difficulty
  let timeEstimate = '5-10 minutes';
  if (habit.difficulty === 'easy') timeEstimate = '2-5 minutes';
  if (habit.difficulty === 'hard') timeEstimate = '15-30 minutes';

  // Tips
  const tips = [
    'Start small and gradually increase intensity',
    'Pair this habit with an existing routine for better consistency'
  ];

  return { whyPoints, howSteps, timeEstimate, tips };
}

export function HabitInfoModal({ habit, open, onClose, onAdd, isAdded }: HabitInfoModalProps) {
  if (!habit) return null;

  const { whyPoints, howSteps, timeEstimate, tips } = generateHabitInfo(habit);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl">
        <DialogHeader className="space-y-4 pb-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{DOMAIN_EMOJIS[habit.domain]}</div>
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold mb-3 leading-tight">{habit.title}</DialogTitle>
              <Badge className={cn(
                "text-sm font-semibold px-4 py-2",
                habit.difficulty === 'easy' && "bg-emerald-100/80 text-emerald-800 border-emerald-300/50 dark:bg-emerald-900/30 dark:text-emerald-300",
                habit.difficulty === 'medium' && "bg-amber-100/80 text-amber-800 border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-300",
                habit.difficulty === 'hard' && "bg-red-100/80 text-red-800 border-red-300/50 dark:bg-red-900/30 dark:text-red-300"
              )}>
                {habit.difficulty} difficulty
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* What it is */}
          <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="text-2xl">💡</span> What it is
            </h3>
            <p className="text-foreground/90 leading-relaxed text-base">{habit.description}</p>
          </div>

          {/* Why it matters */}
          <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
            <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
              <span className="text-2xl">🎯</span> Why it matters
            </h3>
            <ul className="space-y-3">
              {whyPoints.map((point, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <span className="text-emerald-500 text-lg mt-0.5">•</span>
                  <span className="text-base leading-relaxed">{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* How to do it */}
          <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
            <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
              <span className="text-2xl">📋</span> How to do it
            </h3>
            <ol className="space-y-4">
              {howSteps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 text-foreground/80"
                >
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mt-0.5 shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-base leading-relaxed">{step}</span>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Time needed */}
          <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="text-2xl">⏱️</span> Time needed
            </h3>
            <p className="text-foreground/80 text-base leading-relaxed">{timeEstimate}</p>
          </div>

          {/* Pro tips */}
          <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
            <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
              <span className="text-2xl">✨</span> Pro tips
            </h3>
            <ul className="space-y-3">
              {tips.map((tip, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <span className="text-amber-500 text-lg mt-0.5">💡</span>
                  <span className="text-base leading-relaxed">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Add button */}
        <div className="pt-8 border-t border-border/40">
          {isAdded ? (
            <Button disabled className="w-full h-14 text-base font-semibold rounded-xl" variant="outline">
              <Check className="w-5 h-5 mr-2" />
              Already Added
            </Button>
          ) : (
            <Button onClick={onAdd} className="w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Add this habit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}