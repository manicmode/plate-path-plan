import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const recoveryTips = [
  {
    title: "Deep Breathing Reset",
    tip: "Take 3 deep breaths: inhale for 4 counts, hold for 4, exhale for 6. This activates your parasympathetic nervous system for instant calm.",
    icon: "🫁"
  },
  {
    title: "Mindful Movement",
    tip: "Even 5 minutes of gentle stretching can improve circulation and reduce muscle tension. Focus on areas that feel tight.",
    icon: "🧘‍♀️"
  },
  {
    title: "Sleep Hygiene",
    tip: "Keep your bedroom cool (65-68°F) and avoid screens 1 hour before bed. Your recovery happens during quality sleep.",
    icon: "😴"
  },
  {
    title: "Hydration Check",
    tip: "Start your day with a glass of water. Proper hydration supports muscle recovery and mental clarity.",
    icon: "💧"
  },
  {
    title: "Stress Release",
    tip: "When feeling overwhelmed, try the 5-4-3-2-1 technique: name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste.",
    icon: "🌱"
  },
  {
    title: "Recovery Nutrition",
    tip: "Include anti-inflammatory foods like berries, leafy greens, and omega-3 rich fish to support your body's natural healing.",
    icon: "🥗"
  },
  {
    title: "Digital Detox",
    tip: "Take a 10-minute break from all screens every hour. Look out a window or practice gentle eye exercises.",
    icon: "📱"
  },
  {
    title: "Gratitude Practice",
    tip: "Write down 3 things you're grateful for today. Gratitude practice has been shown to reduce stress and improve mood.",
    icon: "🙏"
  }
];

export const RecoveryTips = () => {
  const isMobile = useIsMobile();
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    // Set a random tip on component mount
    setCurrentTip(Math.floor(Math.random() * recoveryTips.length));
  }, []);

  const getNextTip = () => {
    setCurrentTip((prev) => (prev + 1) % recoveryTips.length);
  };

  const tip = recoveryTips[currentTip];

  return (
    <Card className="glass-card border-0 rounded-3xl">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : 'text-lg'}`}>
          <div className="flex items-center space-x-2">
            <Lightbulb className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-500`} />
            <span>💡 Daily Recovery Tip</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={getNextTip}
            className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            <RefreshCw className="h-4 w-4 text-orange-500" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-2xl p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{tip.icon}</div>
            <div className="flex-1">
              <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-orange-800 dark:text-orange-200 mb-2`}>
                {tip.title}
              </h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-700 dark:text-orange-300 leading-relaxed`}>
                {tip.tip}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};