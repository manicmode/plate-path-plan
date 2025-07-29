import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Dumbbell } from 'lucide-react';
import { useWorkoutPlayer, Exercise } from '@/hooks/useWorkoutPlayer';
import { ExerciseIntroCard } from './ExerciseIntroCard';
import { SetExecutionCard } from './SetExecutionCard';
import { RestTimerCard } from './RestTimerCard';
import { ExerciseCompleteCard } from './ExerciseCompleteCard';
import { WorkoutSummaryModal } from './WorkoutSummaryModal';

interface WorkoutPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  routineId: string;
  dayName: string;
  dayIndex: number;
  exercises: Exercise[];
}

export function WorkoutPlayer({
  isOpen,
  onClose,
  routineId,
  dayName,
  dayIndex,
  exercises
}: WorkoutPlayerProps) {
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const {
    sessionId,
    currentExercise,
    currentExerciseIndex,
    currentSetIndex,
    phase,
    currentLog,
    timerSeconds,
    isTimerActive,
    sessionStartTime,
    initializeSession,
    startSet,
    completeCurrentSet,
    extendRest,
    skipRest,
    updateCurrentSet,
    updateExerciseNotes,
    markExerciseComplete,
    saveWorkoutSession,
    totalExercises,
    completedExercises,
    currentSetNumber,
    totalSets,
    progressPercentage
  } = useWorkoutPlayer(routineId, dayName, dayIndex, exercises);

  const [sessionNotes, setSessionNotes] = useState('');

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen, sessionId, initializeSession]);

  const handleComplete = async () => {
    await saveWorkoutSession();
    setShowSummaryModal(true);
  };

  if (!currentExercise || !sessionId) {
    return null;
  }

  const currentSet = currentLog.sets[currentSetIndex];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {dayName.charAt(0).toUpperCase() + dayName.slice(1)} Workout
              </DialogTitle>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span>Exercise {currentExerciseIndex + 1} of {totalExercises}</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Main Content Based on Phase */}
            {phase === 'exercise-intro' && (
              <ExerciseIntroCard
                exercise={currentExercise}
                currentSet={currentSetNumber}
                totalSets={totalSets}
                onStartSet={startSet}
              />
            )}

            {phase === 'set-active' && currentSet && (
              <SetExecutionCard
                exercise={currentExercise}
                currentSet={currentSetNumber}
                totalSets={totalSets}
                setData={currentSet}
                timerSeconds={timerSeconds}
                isTimerActive={isTimerActive}
                onCompleteSet={completeCurrentSet}
                onUpdateSet={updateCurrentSet}
              />
            )}

            {phase === 'set-rest' && (
              <RestTimerCard
                timerSeconds={timerSeconds}
                onExtendRest={extendRest}
                onSkipRest={skipRest}
                nextSetNumber={currentSetNumber + 1}
              />
            )}

            {phase === 'exercise-complete' && (
              <ExerciseCompleteCard
                exercise={currentExercise}
                exerciseLog={currentLog}
                onUpdateNotes={updateExerciseNotes}
                onMarkComplete={markExerciseComplete}
                isLastExercise={currentExerciseIndex === exercises.length - 1}
              />
            )}

            {phase === 'workout-complete' && (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-green-600">🎉 Workout Complete!</h2>
                  <p className="text-lg text-muted-foreground">
                    Amazing work! You've completed your {dayName} routine.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{completedExercises}</div>
                    <div className="text-sm text-muted-foreground">Exercises</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{totalExercises}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Workout Notes</Label>
                  <Textarea
                    placeholder="How was your workout today? Any observations or goals for next time?"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleComplete}
                  size="lg" 
                  className="w-full bg-green-600 hover:bg-green-700 text-lg font-semibold py-6"
                >
                  Save & Finish Workout
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Summary Modal */}
      {showSummaryModal && sessionId && (
        <WorkoutSummaryModal
          isOpen={showSummaryModal}
          onClose={() => {
            setShowSummaryModal(false);
            onClose();
          }}
          sessionId={sessionId}
          workoutData={{
            dayName,
            totalExercises,
            completedExercises,
            duration: sessionStartTime 
              ? Math.round((new Date().getTime() - sessionStartTime.getTime()) / 60000)
              : 0,
            routineId
          }}
        />
      )}
    </>
  );
}