import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Target, Clock } from 'lucide-react';
import { Exercise } from '@/hooks/useWorkoutPlayer';

interface ExerciseIntroCardProps {
  exercise: Exercise;
  currentSet: number;
  totalSets: number;
  onStartSet: () => void;
}

export function ExerciseIntroCard({ exercise, currentSet, totalSets, onStartSet }: ExerciseIntroCardProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{exercise.name}</CardTitle>
        <div className="flex justify-center gap-2 mt-2">
          {exercise.muscle_groups?.map((muscle) => (
            <Badge key={muscle} variant="secondary" className="text-xs">
              {muscle}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Exercise Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">{currentSet}</div>
            <div className="text-sm text-muted-foreground">of {totalSets}</div>
            <div className="text-xs text-muted-foreground">Set</div>
          </div>
          
          {exercise.reps && (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">{exercise.reps}</div>
              <div className="text-xs text-muted-foreground">Reps</div>
            </div>
          )}
          
          {exercise.duration_seconds && (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {formatTime(exercise.duration_seconds)}
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {exercise.instructions && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Instructions
            </h4>
            <p className="text-sm text-muted-foreground">
              {exercise.instructions}
            </p>
          </div>
        )}

        {/* Rest Info */}
        {exercise.rest_seconds && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Rest: {formatTime(exercise.rest_seconds)} between sets
              </span>
            </div>
          </div>
        )}

        {/* Start Button */}
        <Button 
          onClick={onStartSet}
          size="lg" 
          className="w-full bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-lg font-semibold py-6"
        >
          <Play className="mr-2 h-5 w-5" />
          Start Set {currentSet}
        </Button>
      </CardContent>
    </Card>
  );
}