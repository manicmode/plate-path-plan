import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Zap } from 'lucide-react';

interface RecoveryCommandBarProps {
  onCommand?: (command: string) => void;
}

export const RecoveryCommandBar = ({ onCommand }: RecoveryCommandBarProps) => {
  const isMobile = useIsMobile();

  const recoveryCommands = [
    "Breathing tips",
    "Help with sleep", 
    "Daily mindfulness",
    "How to relax fast",
    "Best recovery routine",
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
          <span>⚡ Quick Start Questions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="grid grid-cols-2 gap-3">
          {recoveryCommands.map((command, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleCommand(command)}
              className={`${isMobile ? 'text-xs px-3 py-3 h-auto' : 'text-sm px-4 py-4 h-auto'} text-center justify-center font-semibold bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-800/30 dark:hover:to-cyan-800/30 transition-all duration-200 hover:scale-105 whitespace-normal leading-tight`}
              disabled={false}
            >
              {command}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};