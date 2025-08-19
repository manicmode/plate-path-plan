import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProTipProps {
  tab: 'browse' | 'habits' | 'reminders' | 'analytics';
}

const PRO_TIPS = {
  browse: [
    "Start with 1–2 easy habits to build confidence.",
    "Filter by domain to match your current goals.",
    "Don't overwhelm yourself—less is more."
  ],
  habits: [
    "Tap Log Now right after you do the action—it's the best reinforcement.",
    "Pause habits you can't focus on. Better to pause than to fail.",
    "Adjust targets weekly if they feel too easy or too hard."
  ],
  reminders: [
    "Pick a reminder time you'll actually notice—like after brushing teeth.",
    "Stack reminders onto existing routines.",
    "Weekly reminders work best for weekend habits."
  ],
  analytics: [
    "Check your 7d vs 30d view to spot consistency.",
    "Small wins add up. Even 3 logs a week makes a huge shift.",
    "Gaps are signals, not failures—just restart the next day."
  ]
};

export const ProTip: React.FC<ProTipProps> = ({ tab }) => {
  // Rotate tip based on current time to ensure it changes periodically
  const tip = useMemo(() => {
    const tips = PRO_TIPS[tab];
    const index = Math.floor(Date.now() / (1000 * 60 * 10)) % tips.length; // Change every 10 minutes
    return tips[index];
  }, [tab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-6"
    >
      <Card className="w-full rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 md:h-5 md:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1 md:text-base">
                Pro Tip
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-200 md:text-base">
                {tip}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};