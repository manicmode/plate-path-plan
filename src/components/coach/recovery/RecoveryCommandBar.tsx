import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Zap } from 'lucide-react';

interface RecoveryCommandBarProps {
  onCommand?: (payload: { chipId: string; text: string }) => void;
}

export const RecoveryCommandBar = ({ onCommand }: RecoveryCommandBarProps) => {
  const isMobile = useIsMobile();

  const recoveryCommands = [
    { id: 'rec_weekly_check', label: 'Weekly recovery check', message: 'How’s my recovery? Sleep {{sleep_avg_7d}}h, stress {{stress_avg_7d}}/10, score {{recovery_score}}.' },
    { id: 'rec_10min_reset', label: '10-minute reset', message: 'Give me a 10-min routine right now to lower stress from {{stress_avg_7d}}/10.' },
    { id: 'rec_sleep_opt', label: 'Sleep optimization', message: 'Improve my sleep this week based on {{sleep_avg_7d}}h.' },
    { id: 'rec_build_habit', label: 'Build on my habit', message: 'Build on my top habit: {{top_practice}} (longest streak {{longest_recovery_streak}}).' },
    { id: 'rec_supp_adherence', label: 'Supplement adherence', message: 'I took supplements {{supp_days_7d}}/7 days — make a simple adherence plan.' },
    { id: 'rec_sync_training', label: 'Recovery + training sync', message: 'Align recovery with training so {{goal_primary}} stays on track.' },
  ];

  const handleCommand = (cmd: { chipId: string; text: string }) => {
    if (onCommand) {
      onCommand(cmd);
    }
  };

  return (
    <Card className="glass-card border-0 rounded-3xl">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-500`} />
          <span>⚡ Quick Start Questions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="grid grid-cols-2 gap-3">
          {recoveryCommands.map((cmd) => (
            <Button
              key={cmd.id}
              variant="outline"
              size="sm"
              onClick={() => handleCommand({ chipId: cmd.id, text: cmd.message })}
              className={`${isMobile ? 'text-xs px-3 py-3 h-auto' : 'text-sm px-4 py-4 h-auto'} text-center justify-center font-semibold bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 border-orange-200 dark:border-orange-700 hover:from-orange-100 hover:to-pink-100 dark:hover:from-orange-800/30 dark:hover:to-pink-800/30 transition-all duration-200 hover:scale-105 whitespace-normal leading-tight`}
              disabled={false}
            >
              {cmd.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};