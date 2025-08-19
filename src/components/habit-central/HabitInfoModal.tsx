import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Check, Plus } from 'lucide-react';
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
      {/* Centered modal overlay */}
      <div className="fixed inset-0 z-[100] grid place-items-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        {/* Modal panel */}
        <DialogContent className={cn(
          "w-[min(92vw,560px)] rounded-3xl bg-slate-950/75 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden",
          "relative z-10 max-h-[90vh] overflow-y-auto"
        )}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          
          {/* Centered header */}
          <div className="flex flex-col items-center gap-3 pt-6 pb-6">
            {/* Centered icon */}
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-2xl">
              {DOMAIN_EMOJIS[habit.domain]}
            </div>
            
            {/* Centered title */}
            <DialogTitle className="text-2xl font-extrabold leading-tight text-center tracking-tight text-white">
              {habit.title}
            </DialogTitle>
            
            {/* Centered difficulty pill */}
            <Badge className={cn(
              "text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15",
              habit.difficulty === 'easy' && "text-emerald-300",
              habit.difficulty === 'medium' && "text-amber-300", 
              habit.difficulty === 'hard' && "text-red-300"
            )}>
              {habit.difficulty} difficulty
            </Badge>
          </div>

        <div className="space-y-6 px-6">
          {/* What it is */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-3 text-white">
              <span className="text-xl">💡</span> What it is
            </h3>
            <p className="text-white/80 leading-relaxed text-sm">{habit.description}</p>
          </div>

          {/* Why it matters */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-white">
              <span className="text-xl">🎯</span> Why it matters
            </h3>
            <ul className="space-y-2">
              {whyPoints.map((point, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-white/70"
                >
                  <span className="text-emerald-400 text-sm mt-1">•</span>
                  <span className="text-sm leading-relaxed">{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* How to do it */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-white">
              <span className="text-xl">📋</span> How to do it
            </h3>
            <ol className="space-y-3">
              {howSteps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-white/70"
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
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-3 text-white">
              <span className="text-xl">⏱️</span> Time needed
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">{timeEstimate}</p>
          </div>

          {/* Pro tips */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-white">
              <span className="text-xl">✨</span> Pro tips
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 text-white/70"
                >
                  <span className="text-amber-400 text-sm mt-1">💡</span>
                  <span className="text-sm leading-relaxed">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Add button */}
        <div className="px-6 pb-6 pt-4">
          {isAdded ? (
            <Button disabled className="w-full h-12 text-sm font-semibold rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30" variant="outline">
              <Check className="w-4 h-4 mr-2" />
              Already Added
            </Button>
          ) : (
            <Button onClick={onAdd} className="w-full h-12 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Add this habit
            </Button>
          )}
        </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}