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
      <DialogContent className="mx-auto w-[92vw] max-w-[420px] rounded-3xl overflow-hidden border border-white/10 bg-[rgba(16,18,28,.6)] backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="space-y-4 pb-6 text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full grid place-items-center bg-white/10 border border-white/15">
            <span className="text-2xl">{DOMAIN_EMOJIS[habit.domain]}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-center">{habit.title}</DialogTitle>
          <div className="flex justify-center">
            <Badge className={cn(
              "text-sm font-semibold px-4 py-2 text-center",
              habit.difficulty === 'easy' && "bg-emerald-100/80 text-emerald-800 border-emerald-300/50 dark:bg-emerald-900/30 dark:text-emerald-300",
              habit.difficulty === 'medium' && "bg-amber-100/80 text-amber-800 border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-300",
              habit.difficulty === 'hard' && "bg-red-100/80 text-red-800 border-red-300/50 dark:bg-red-900/30 dark:text-red-300"
            )}>
              {habit.difficulty} difficulty
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* What it is */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span> What it is
            </h3>
            <p className="text-foreground/90 leading-relaxed text-sm">{habit.description}</p>
          </div>

          {/* Why it matters */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">🎯</span> Why it matters
            </h3>
            <ul className="space-y-2">
              {whyPoints.map((point, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <span className="text-emerald-500 text-sm mt-1">•</span>
                  <span className="text-sm leading-relaxed">{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* How to do it */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">📋</span> How to do it
            </h3>
            <ol className="space-y-3">
              {howSteps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed">{step}</span>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Time needed */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-xl">⏱️</span> Time needed
            </h3>
            <p className="text-foreground/80 text-sm leading-relaxed">{timeEstimate}</p>
          </div>

          {/* Pro tips */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span> Pro tips
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <span className="text-amber-500 text-sm mt-1">💡</span>
                  <span className="text-sm leading-relaxed">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Add button */}
        <div className="sticky bottom-0 -mx-4 px-4 pb-[env(safe-area-inset-bottom)] pt-3 bg-gradient-to-t from-background/95 to-background/0 backdrop-blur-md">
          {isAdded ? (
            <Button disabled className="w-full h-12 text-sm font-semibold rounded-xl" variant="outline">
              <Check className="w-4 h-4 mr-2" />
              Already Added
            </Button>
          ) : (
            <Button onClick={onAdd} className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Add this habit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}