import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutCompletion } from '@/contexts/WorkoutCompletionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, RotateCcw, Lock, Clock, Target, Zap } from 'lucide-react';

interface WorkoutDay {
  day: number;
  dayName: string;
  workout?: {
    title: string;
    muscleGroups: string[];
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      notes?: string;
    }>;
    duration: number;
    difficulty: string;
  };
  isRestDay: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

interface WorkoutDetailModalProps {
  workout: WorkoutDay;
  week: number;
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete: (workout: WorkoutDay) => void;
}

export const WorkoutDetailModal = ({ 
  workout, 
  week, 
  isOpen, 
  onClose, 
  onMarkComplete 
}: WorkoutDetailModalProps) => {
  const { showCompletionModal } = useWorkoutCompletion();
  
  if (!workout.workout) return null;

  const handleMarkComplete = () => {
    onMarkComplete(workout);
    
    // Show completion modal with workout data
    showCompletionModal({
      workoutId: `${workout.dayName}-week-${week}`,
      workoutType: 'ai_routine',
      durationMinutes: workout.workout.duration,
      exercisesCount: workout.workout.exercises.length,
      setsCount: workout.workout.exercises.reduce((total, exercise) => total + exercise.sets, 0),
      musclesWorked: workout.workout.muscleGroups,
      workoutData: {
        week,
        day: workout.dayName,
        title: workout.workout.title,
        difficulty: workout.workout.difficulty
      }
    });
    
    onClose();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'advanced':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{workout.workout.title}</span>
            <Badge 
              className={getDifficultyColor(workout.workout.difficulty)}
              variant="secondary"
            >
              {workout.workout.difficulty}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Week {week} • {workout.dayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Workout Overview */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <Clock className="h-5 w-5 text-blue-600 mb-1" />
                  <span className="text-sm font-medium">{workout.workout.duration} min</span>
                  <span className="text-xs text-muted-foreground">Duration</span>
                </div>
                <div className="flex flex-col items-center">
                  <Target className="h-5 w-5 text-green-600 mb-1" />
                  <span className="text-sm font-medium">{workout.workout.exercises.length}</span>
                  <span className="text-xs text-muted-foreground">Exercises</span>
                </div>
                <div className="flex flex-col items-center">
                  <Zap className="h-5 w-5 text-orange-600 mb-1" />
                  <span className="text-sm font-medium">{workout.workout.muscleGroups.length}</span>
                  <span className="text-xs text-muted-foreground">Muscle Groups</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Muscle Groups */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              🎯 Target Muscle Groups
            </h4>
            <div className="flex flex-wrap gap-2">
              {workout.workout.muscleGroups.map((muscle, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Exercises List */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              💪 Exercise Breakdown
            </h4>
            <div className="space-y-3">
              {workout.workout.exercises.map((exercise, index) => (
                <Card key={index} className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-foreground">{exercise.name}</h5>
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sets:</span>
                        <span className="ml-1 font-medium">{exercise.sets}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reps:</span>
                        <span className="ml-1 font-medium">{exercise.reps}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rest:</span>
                        <span className="ml-1 font-medium">{exercise.rest}</span>
                      </div>
                    </div>
                    
                    {exercise.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                        <span className="text-yellow-600 dark:text-yellow-400">💡 </span>
                        {exercise.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Notes */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">🤖</div>
                <div>
                  <h5 className="font-medium text-purple-700 dark:text-purple-300 mb-1">
                    AI Coach Notes
                  </h5>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Focus on proper form and controlled movements. Take adequate rest between sets to maintain quality throughout the workout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleMarkComplete}
              className={`flex-1 ${
                workout.isCompleted
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              <Check className="h-4 w-4 mr-2" />
              {workout.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
            
            {!workout.isLocked && (
              <Button variant="outline" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Regenerate
              </Button>
            )}
            
            {workout.isLocked && (
              <Button variant="outline" disabled className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Locked
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};