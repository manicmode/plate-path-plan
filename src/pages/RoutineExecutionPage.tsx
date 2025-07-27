import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, CheckCircle, Clock, Timer, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoutineExecution } from '@/hooks/useRoutineExecution';
import { cn } from '@/lib/utils';
import { AICoachFeedback } from '@/components/routine/AICoachFeedback';

const RoutineExecutionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const routineId = searchParams.get('routineId') || '1';
  
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const {
    steps,
    currentStep,
    currentStepIndex,
    timeRemaining,
    isRunning,
    isPaused,
    isCompleted,
    routine,
    currentDay,
    progress,
    handleStart,
    handlePause,
    handleNextStep,
    handlePrevStep,
    handleComplete,
    formatTime
  } = useRoutineExecution({ 
    routineId,
    onComplete: () => {
      setShowCompletionDialog(true);
      toast.success("🎉 Workout Complete! Logged in your fitness history.");
    }
  });

  // Handle exit confirmation
  const handleExit = () => {
    if (isRunning && !isCompleted) {
      setShowExitDialog(true);
    } else {
      navigate('/exercise-hub');
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    navigate('/exercise-hub');
  };

  // Auto-show completion dialog when workout is completed
  useEffect(() => {
    if (isCompleted) {
      setShowCompletionDialog(true);
    }
  }, [isCompleted]);

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'warmup':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'exercise':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rest':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cooldown':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'warmup':
        return '🔥';
      case 'exercise':
        return '💪';
      case 'rest':
        return '😌';
      case 'cooldown':
        return '🧘';
      default:
        return '⚡';
    }
  };

  if (!routine || !currentStep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your workout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Day {currentDay} – {routine.title}</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
          {isCompleted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Current Step Card */}
          <Card className="w-full shadow-lg border-border bg-card">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-4xl">{getStepTypeIcon(currentStep.type)}</span>
                <Badge className={getStepTypeColor(currentStep.type)}>
                  {currentStep.type.charAt(0).toUpperCase() + currentStep.type.slice(1)}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
              {currentStep.description && (
                <p className="text-muted-foreground">{currentStep.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exercise Media Display */}
              {currentStep.exerciseName && (
                <div className="text-center">
                  <div className="relative w-48 h-48 mx-auto mb-4 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={currentStep.imageUrl}
                      alt={currentStep.exerciseName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                              <div class="text-center">
                                <div class="text-4xl mb-2">💪</div>
                                <div class="text-sm font-medium">${currentStep.exerciseName?.replace(/-/g, ' ') || 'Exercise'}</div>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Timer Display */}
              {currentStep.duration !== undefined && currentStep.duration > 0 && (
                <div className="text-center">
                  <div className={cn(
                    "text-6xl font-bold mb-2",
                    timeRemaining <= 10 && isRunning ? "text-red-500 animate-pulse" : "text-primary"
                  )}>
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentStep.type === 'rest' ? 'Rest time remaining' : 'Time remaining'}
                  </p>
                </div>
              )}

              {/* Exercise Details */}
              {currentStep.type === 'exercise' && (
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {currentStep.reps && (
                      <div>
                        <div className="text-2xl font-bold text-primary">{currentStep.reps}</div>
                        <div className="text-sm text-muted-foreground">Reps</div>
                      </div>
                    )}
                    {currentStep.sets && currentStep.currentSet && (
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {currentStep.currentSet}/{currentStep.sets}
                        </div>
                        <div className="text-sm text-muted-foreground">Set</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {currentStep.instructions && (
                <Alert>
                  <AlertDescription className="text-center">
                    {currentStep.instructions}
                  </AlertDescription>
                </Alert>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className="h-12 w-12"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                {currentStep.duration !== undefined && currentStep.duration > 0 ? (
                  <Button
                    size="lg"
                    onClick={isRunning ? handlePause : handleStart}
                    className="h-12 px-8 bg-primary hover:bg-primary/90"
                  >
                    {isRunning && !isPaused ? (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        {isPaused ? 'Resume' : 'Start'}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleNextStep}
                    className="h-12 px-8 bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Complete
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextStep}
                  disabled={currentStepIndex === steps.length - 1}
                  className="h-12 w-12"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Steps Preview */}
          {!isCompleted && currentStepIndex < steps.length - 1 && (
            <Card className="w-full border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Up Next</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {steps.slice(currentStepIndex + 1, currentStepIndex + 4).map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <span className="text-lg">{getStepTypeIcon(step.type)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{step.title}</div>
                        {step.description && (
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                        )}
                      </div>
                      {step.duration && step.duration > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          {formatTime(step.duration)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Workout?</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your progress won't be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Continue Workout
            </Button>
            <Button variant="destructive" onClick={confirmExit}>
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog with AI Feedback */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">🎉 Workout Complete!</DialogTitle>
            <DialogDescription className="text-center">
              Great job! Your workout has been logged in your fitness history.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-4xl mb-4">💪</div>
            <div className="space-y-2">
              <p className="font-medium">Day {currentDay} – {routine.title}</p>
              <p className="text-sm text-muted-foreground">
                {steps.length} steps completed
              </p>
            </div>
          </div>
          
          {/* AI Coach Feedback Section */}
          <AICoachFeedback 
            routineName={routine?.title}
            duration={Math.floor(steps.reduce((acc, step) => acc + (step.duration || 0), 0) / 60)}
            categories={['strength']}
            completedSteps={steps.map(step => step.title)}
            skippedSteps={[]}
          />
          
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => {
                setShowCompletionDialog(false);
                navigate('/exercise-hub');
              }}
            >
              Return to Exercise Hub
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setShowCompletionDialog(false);
                navigate('/analytics');
              }}
            >
              View Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutineExecutionPage;