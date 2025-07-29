import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, RefreshCw, Loader2, Clock, Target, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutExecutionModal } from './WorkoutExecutionModal';

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds?: number;
  instructions?: string;
  muscle_groups?: string[];
}

interface DayData {
  day_name: string;
  focus: string;
  exercises: Exercise[];
  estimated_duration: number;
  warm_up?: Exercise[];
  cool_down?: Exercise[];
}

interface WeeklyRoutineDayProps {
  day: string;
  dayData: DayData | null;
  isLocked: boolean;
  isRegenerating: boolean;
  onToggleLock: () => void;
  onRegenerate: () => void;
  muscleGroups: string[];
  routineId?: string;
}

export function WeeklyRoutineDay({
  day,
  dayData,
  isLocked,
  isRegenerating,
  onToggleLock,
  onRegenerate,
  muscleGroups,
  routineId
}: WeeklyRoutineDayProps) {
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  
  const isRestDay = dayData?.focus === 'Rest' || !dayData?.exercises?.length;
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayIndex = daysOfWeek.indexOf(day.toLowerCase());
  
  const getIntensityColor = (focus: string) => {
    if (focus === 'Rest') return 'text-muted-foreground';
    if (focus.toLowerCase().includes('high') || focus.toLowerCase().includes('strength')) return 'text-red-500';
    if (focus.toLowerCase().includes('moderate') || focus.toLowerCase().includes('endurance')) return 'text-amber-500';
    return 'text-green-500';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins > 0 ? `${mins}m` : `${seconds}s`;
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      isLocked && "ring-2 ring-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
      isRegenerating && "animate-pulse",
      isRestDay && "opacity-75"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {day.charAt(0).toUpperCase() + day.slice(1)}
              {dayData?.estimated_duration && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {dayData.estimated_duration}min
                </Badge>
              )}
            </CardTitle>
            {dayData?.focus && (
              <p className={cn("text-sm font-medium", getIntensityColor(dayData.focus))}>
                {dayData.focus}
              </p>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLock}
              className={cn(
                "h-8 w-8 p-0",
                isLocked && "text-amber-600 hover:text-amber-700"
              )}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
            
            {!isRestDay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isLocked || isRegenerating}
                className="h-8 w-8 p-0"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Muscle Groups */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {muscleGroups.map((group) => (
              <Badge key={group} variant="secondary" className="text-xs">
                {group}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isRestDay ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Rest & Recovery Day</p>
            <p className="text-xs">Let your muscles rebuild stronger</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Warm-up */}
            {dayData?.warm_up && dayData.warm_up.length > 0 && (
              <div className="border-l-2 border-green-500 pl-3">
                <h4 className="text-sm font-medium text-green-600 mb-1">Warm-up</h4>
                {dayData.warm_up.slice(0, 2).map((exercise, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    {exercise.name}
                    {exercise.duration_seconds && ` (${formatDuration(exercise.duration_seconds)})`}
                  </div>
                ))}
              </div>
            )}

            {/* Main Exercises */}
            <div className="space-y-2">
              {dayData?.exercises?.slice(0, 4).map((exercise, idx) => (
                <div key={exercise.id || idx} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{exercise.name}</h4>
                    <div className="text-xs text-muted-foreground">
                      {exercise.sets && exercise.reps && `${exercise.sets} × ${exercise.reps}`}
                      {exercise.duration_seconds && formatDuration(exercise.duration_seconds)}
                    </div>
                  </div>
                  {exercise.muscle_groups && (
                    <div className="flex gap-1 mt-1">
                      {exercise.muscle_groups.slice(0, 2).map((muscle) => (
                        <Badge key={muscle} variant="outline" className="text-xs h-4 px-1">
                          {muscle}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {dayData?.exercises && dayData.exercises.length > 4 && (
                <div className="text-center text-xs text-muted-foreground">
                  +{dayData.exercises.length - 4} more exercises
                </div>
              )}
            </div>

            {/* Cool-down */}
            {dayData?.cool_down && dayData.cool_down.length > 0 && (
              <div className="border-l-2 border-blue-500 pl-3">
                <h4 className="text-sm font-medium text-blue-600 mb-1">Cool-down</h4>
                {dayData.cool_down.slice(0, 2).map((exercise, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    {exercise.name}
                    {exercise.duration_seconds && ` (${formatDuration(exercise.duration_seconds)})`}
                  </div>
                ))}
              </div>
            )}

            {/* Start Workout Button */}
            {dayData?.exercises && dayData.exercises.length > 0 && routineId && (
              <Button 
                onClick={() => setShowWorkoutModal(true)}
                size="sm" 
                className="w-full mt-4"
              >
                <Play className="mr-2 h-4 w-4" />
                Start {day.charAt(0).toUpperCase() + day.slice(1)} Workout
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Workout Execution Modal */}
      {showWorkoutModal && dayData?.exercises && routineId && (
        <WorkoutExecutionModal
          isOpen={showWorkoutModal}
          onClose={() => setShowWorkoutModal(false)}
          routineId={routineId}
          dayName={day}
          dayIndex={dayIndex}
          exercises={dayData.exercises}
          estimatedDuration={dayData.estimated_duration || 45}
        />
      )}
    </Card>
  );
}