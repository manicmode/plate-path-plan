import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Wind, Sparkles, Moon, Zap } from 'lucide-react';

interface RecoveryCommandBarProps {
  onCommand?: (command: string) => void;
}

export const RecoveryCommandBar = ({ onCommand }: RecoveryCommandBarProps) => {
  const isMobile = useIsMobile();

  const recoveryCommands = [
    { label: "Guide me through breathing", icon: Wind, color: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700" },
    { label: "Give me a stretching routine", icon: Sparkles, color: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700" },
    { label: "Help me wind down for sleep", icon: Moon, color: "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700" },
    { label: "Suggest a yoga flow", icon: Zap, color: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700" },
    { label: "Meditation for stress relief", icon: Sparkles, color: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700" },
    { label: "Quick recovery check-in", icon: Wind, color: "from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-200 dark:border-rose-700" },
  ];

  const handleCommand = (command: string) => {
    if (onCommand) {
      onCommand(command);
    }
  };

  return (
    <Card className="glass-card border-0 rounded-3xl">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Zap className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>⚡ Quick Recovery Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <ScrollArea className="w-full">
          <div className="flex space-x-3 pb-2">
            {recoveryCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCommand(command.label)}
                  className={`${isMobile ? 'text-xs px-4 py-3 h-auto' : 'text-sm px-6 py-4 h-auto'} whitespace-nowrap font-semibold bg-gradient-to-r ${command.color} hover:scale-105 transition-all duration-200 flex items-center space-x-2`}
                >
                  <Icon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  <span>{command.label}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};