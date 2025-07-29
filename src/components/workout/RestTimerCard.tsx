import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Plus, SkipForward } from 'lucide-react';

interface RestTimerCardProps {
  timerSeconds: number;
  onExtendRest: (seconds: number) => void;
  onSkipRest: () => void;
  nextSetNumber: number;
}

export function RestTimerCard({ timerSeconds, onExtendRest, onSkipRest, nextSetNumber }: RestTimerCardProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-300">
          <Timer className="h-5 w-5" />
          Rest Time
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 text-center">
        {/* Timer Display */}
        <div className="space-y-2">
          <div className="text-6xl font-bold text-orange-600 dark:text-orange-400">
            {formatTime(timerSeconds)}
          </div>
          <div className="text-sm text-muted-foreground">
            Preparing for Set {nextSetNumber}
          </div>
        </div>

        {/* Rest Tips */}
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <div className="text-sm text-orange-700 dark:text-orange-300">
            💧 Stay hydrated • 🫁 Breathe deeply • 🎯 Visualize your next set
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onExtendRest(15)}
            className="flex-1"
          >
            <Plus className="mr-1 h-3 w-3" />
            +15s
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => onExtendRest(30)}
            className="flex-1"
          >
            <Plus className="mr-1 h-3 w-3" />
            +30s
          </Button>
          
          <Button 
            onClick={onSkipRest}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            <SkipForward className="mr-1 h-3 w-3" />
            Skip
          </Button>
        </div>

        {/* Motivation Message */}
        {timerSeconds <= 10 && timerSeconds > 0 && (
          <div className="animate-pulse">
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              ⏰ Almost ready! Get in position.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}