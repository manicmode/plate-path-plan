import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useXPSystem } from '@/hooks/useXPSystem';
import { Zap, Trophy, Star, Heart } from 'lucide-react';

export const XPDemoCard = () => {
  const { awardUserXP } = useXPSystem();

  const demoActions = [
    {
      icon: <Zap className="h-4 w-4" />,
      label: 'Test Meal Log',
      action: () => awardUserXP('nutrition', 10, 'Meal Logged (Demo)', undefined, 0),
      description: '+10 XP'
    },
    {
      icon: <Star className="h-4 w-4" />,
      label: 'Test Hydration',
      action: () => awardUserXP('hydration', 5, 'Hydrated (Demo)', undefined, 2),
      description: '+5 XP (+2 bonus)'
    },
    {
      icon: <Heart className="h-4 w-4" />,
      label: 'Test Recovery',
      action: () => awardUserXP('recovery', 15, 'Recovery Practice (Demo)', undefined, 5),
      description: '+15 XP (+5 bonus)'
    },
    {
      icon: <Trophy className="h-4 w-4" />,
      label: 'Big Bonus',
      action: () => awardUserXP('nutrition', 25, 'Achievement Unlocked! (Demo)', undefined, 15),
      description: '+25 XP (+15 bonus)'
    }
  ];

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
          <Zap className="h-5 w-5" />
          XP System Demo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Test the new XP system! Each action awards experience points with potential streak bonuses.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {demoActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={action.action}
              className="flex items-center gap-2 p-3 h-auto bg-white/50 dark:bg-gray-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-700"
            >
              <div className="flex items-center gap-2 flex-1">
                {action.icon}
                <div className="text-left">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
          <p className="text-xs text-purple-700 dark:text-purple-300">
            💡 <strong>XP Features:</strong> Anti-duplicate (2hr cooldown) • Streak bonuses • Level-up notifications • Progress tracking
          </p>
        </div>
      </CardContent>
    </Card>
  );
};