import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Target } from 'lucide-react';
import { Exercise, ExerciseLog } from '@/hooks/useWorkoutPlayer';

interface ExerciseCompleteCardProps {
  exercise: Exercise;
  exerciseLog: ExerciseLog;
  onUpdateNotes: (notes: string) => void;
  onMarkComplete: () => void;
  isLastExercise: boolean;
}

export function ExerciseCompleteCard({ 
  exercise, 
  exerciseLog, 
  onUpdateNotes, 
  onMarkComplete,
  isLastExercise 
}: ExerciseCompleteCardProps) {
  const completedSets = exerciseLog.sets.filter(set => set.completed).length;
  const totalReps = exerciseLog.sets.reduce((sum, set) => set.completed ? sum + set.reps : sum, 0);
  const avgWeight = exerciseLog.sets.filter(set => set.completed && set.weight > 0)
    .reduce((sum, set) => sum + set.weight, 0) / Math.max(1, exerciseLog.sets.filter(set => set.completed && set.weight > 0).length);

  return (
    <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-6 w-6" />
          Exercise Complete!
        </CardTitle>
        <div className="text-xl font-semibold">{exercise.name}</div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{completedSets}</div>
            <div className="text-sm text-muted-foreground">Sets</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{totalReps}</div>
            <div className="text-sm text-muted-foreground">Total Reps</div>
          </div>
          
          {avgWeight > 0 && (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{avgWeight.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Weight (kg)</div>
            </div>
          )}
        </div>

        {/* Set-by-Set Breakdown */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Set Performance
          </Label>
          <div className="space-y-2">
            {exerciseLog.sets.map((set, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-2 rounded border ${
                  set.completed 
                    ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="font-medium">Set {index + 1}</span>
                <div className="flex items-center gap-2">
                  {set.completed ? (
                    <>
                      <Badge variant="secondary">{set.reps} reps</Badge>
                      {set.weight > 0 && <Badge variant="secondary">{set.weight}kg</Badge>}
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </>
                  ) : (
                    <Badge variant="outline">Skipped</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
          <div className="text-green-700 dark:text-green-300 font-medium">
            🎉 Excellent work! Your strength is building with every rep.
          </div>
        </div>

        {/* Exercise Notes */}
        <div className="space-y-2">
          <Label>Exercise Notes</Label>
          <Textarea
            placeholder="How did this exercise feel? Any adjustments for next time?"
            value={exerciseLog.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Continue Button */}
        <Button 
          onClick={onMarkComplete}
          size="lg" 
          className="w-full bg-green-600 hover:bg-green-700 text-lg font-semibold py-6"
        >
          {isLastExercise ? (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Finish Workout
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-5 w-5" />
              Next Exercise
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}