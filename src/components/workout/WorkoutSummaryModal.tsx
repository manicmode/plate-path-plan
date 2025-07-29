import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Clock, 
  Target, 
  Zap, 
  TrendingUp, 
  CheckCircle, 
  Flame,
  Droplets,
  Activity,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  workoutData: {
    dayName: string;
    totalExercises: number;
    completedExercises: number;
    duration: number;
    routineId: string;
  };
}

interface WorkoutMetrics {
  completionRate: number;
  totalSets: number;
  completedSets: number;
  duration: number;
  exercisesCompleted: number;
  totalExercises: number;
  avgWeight: number;
  performanceComparison?: string;
}

interface FeedbackData {
  aiFeedback: string;
  recommendations: string[];
  metrics: WorkoutMetrics;
}

export function WorkoutSummaryModal({ 
  isOpen, 
  onClose, 
  sessionId, 
  workoutData 
}: WorkoutSummaryModalProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sessionId) {
      generateFeedback();
    }
  }, [isOpen, sessionId]);

  const generateFeedback = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('workout-ai-feedback', {
        body: {
          sessionId,
          userId: user.id
        }
      });

      if (error) throw error;

      setFeedback(data);
    } catch (error) {
      console.error('Error generating feedback:', error);
      toast({
        title: "Feedback Generation Failed",
        description: "Using default summary instead",
        variant: "destructive",
      });
      
      // Fallback feedback
      setFeedback({
        aiFeedback: "🎉 Excellent work completing your workout! Your dedication to fitness is paying off. Keep up this fantastic momentum!",
        recommendations: [
          "Stay hydrated for optimal recovery",
          "Consider light stretching to prevent soreness",
          "Track your progress for continued motivation"
        ],
        metrics: {
          completionRate: Math.round((workoutData.completedExercises / workoutData.totalExercises) * 100),
          totalSets: 0,
          completedSets: 0,
          duration: workoutData.duration,
          exercisesCompleted: workoutData.completedExercises,
          totalExercises: workoutData.totalExercises,
          avgWeight: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const estimatedCalories = Math.round(workoutData.duration * 8); // Rough estimate

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (!feedback && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Workout Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Completion Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {feedback?.metrics.completionRate || Math.round((workoutData.completedExercises / workoutData.totalExercises) * 100)}%
                </div>
                <div className="text-xs text-green-600 dark:text-green-500">Completion</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatTime(workoutData.duration)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-500">Duration</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4 text-center">
                <Flame className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {estimatedCalories}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-500">Calories</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {workoutData.completedExercises}/{workoutData.totalExercises}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-500">Exercises</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Session Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exercise Completion</span>
                  <span>{workoutData.completedExercises}/{workoutData.totalExercises}</span>
                </div>
                <Progress 
                  value={(workoutData.completedExercises / workoutData.totalExercises) * 100} 
                  className="h-3"
                />
              </div>
              
              {feedback?.metrics.totalSets > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sets Completed</span>
                    <span>{feedback.metrics.completedSets}/{feedback.metrics.totalSets}</span>
                  </div>
                  <Progress 
                    value={(feedback.metrics.completedSets / feedback.metrics.totalSets) * 100}
                    className="h-3"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Feedback */}
          {isLoading ? (
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="font-medium">Generating your personalized feedback...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Coach Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert">
                  <p className="text-base leading-relaxed whitespace-pre-line">
                    {feedback?.aiFeedback}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Comparison */}
          {feedback?.metrics.performanceComparison && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <TrendingUp className="h-5 w-5" />
                  Progress Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-600 dark:text-blue-400">
                  {feedback.metrics.performanceComparison}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Smart Recommendations */}
          {feedback?.recommendations && feedback.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Recovery & Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {feedback.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={onClose}
              size="lg" 
              className="flex-1 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Awesome! Continue Training
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                // Could navigate to progress tracking or recovery section
                onClose();
              }}
              className="flex-1"
            >
              <Droplets className="mr-2 h-4 w-4" />
              Track Recovery
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}