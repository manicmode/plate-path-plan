import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Timer, Plus, Minus } from 'lucide-react';
import { Exercise, SetLog } from '@/hooks/useWorkoutPlayer';

interface SetExecutionCardProps {
  exercise: Exercise;
  currentSet: number;
  totalSets: number;
  setData: SetLog;
  timerSeconds?: number;
  isTimerActive: boolean;
  onCompleteSet: () => void;
  onUpdateSet: (updates: Partial<SetLog>) => void;
}

export function SetExecutionCard({ 
  exercise, 
  currentSet, 
  totalSets, 
  setData, 
  timerSeconds,
  isTimerActive,
  onCompleteSet,
  onUpdateSet 
}: SetExecutionCardProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeBasedExercise = exercise.duration_seconds && exercise.duration_seconds > 0;

  return (
    <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-green-700 dark:text-green-300">
          Set {currentSet} of {totalSets}
        </CardTitle>
        <div className="text-lg font-medium">{exercise.name}</div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Timer Display for Time-Based Exercises */}
        {isTimeBasedExercise && (
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">
              {formatTime(timerSeconds || 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isTimerActive ? 'Keep going!' : 'Ready to start'}
            </div>
          </div>
        )}

        {/* Rep and Weight Tracking */}
        {!isTimeBasedExercise && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reps</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => onUpdateSet({ reps: Math.max(1, setData.reps - 1) })}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={setData.reps}
                  onChange={(e) => onUpdateSet({ reps: parseInt(e.target.value) || 0 })}
                  className="h-9 text-center text-lg font-semibold"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => onUpdateSet({ reps: setData.reps + 1 })}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Weight (kg)</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => onUpdateSet({ weight: Math.max(0, setData.weight - 2.5) })}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  step="0.5"
                  value={setData.weight}
                  onChange={(e) => onUpdateSet({ weight: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-center text-lg font-semibold"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => onUpdateSet({ weight: setData.weight + 2.5 })}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Performance Motivation */}
        <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <div className="text-sm font-medium text-green-700 dark:text-green-300">
            💪 You've got this! Focus on form.
          </div>
        </div>

        {/* Complete Set Button */}
        <Button 
          onClick={onCompleteSet}
          size="lg" 
          className="w-full bg-green-600 hover:bg-green-700 text-lg font-semibold py-6"
        >
          <Check className="mr-2 h-5 w-5" />
          {isTimeBasedExercise && isTimerActive ? 'Complete Early' : 'Complete Set'}
        </Button>
      </CardContent>
    </Card>
  );
}