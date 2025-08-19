import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{DOMAIN_EMOJIS[habit.domain]}</span>
            <div className="flex-1">
              <DialogTitle className="text-left">{habit.title}</DialogTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {habit.domain} • {habit.difficulty}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* What */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              What it is
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {habit.description}
            </p>
          </section>

          {/* Why it matters */}
          <section>
            <h3 className="font-semibold mb-3">Why it matters</h3>
            <ul className="space-y-2">
              {whyPoints.map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-primary font-bold">•</span>
                  <span className="text-muted-foreground">{point}</span>
                </motion.li>
              ))}
            </ul>
          </section>

          {/* How to do it */}
          <section>
            <h3 className="font-semibold mb-3">How to do it</h3>
            <ol className="space-y-2">
              {howSteps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </motion.li>
              ))}
            </ol>
          </section>

          {/* Time estimate */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Time needed
            </h3>
            <p className="text-sm text-muted-foreground">{timeEstimate}</p>
          </section>

          {/* Tips */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Pro tips
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="text-primary font-bold">💡</span>
                  <span className="text-muted-foreground">{tip}</span>
                </motion.li>
              ))}
            </ul>
          </section>
        </div>

        {/* Action */}
        <div className="pt-4 border-t">
          {isAdded ? (
            <Button disabled className="w-full">
              Already Added ✓
            </Button>
          ) : (
            <Button onClick={onAdd} className="w-full">
              Add this habit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}