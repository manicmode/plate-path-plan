import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Sparkles } from 'lucide-react';

interface AICoachFeedbackProps {
  routineName: string;
  duration: number;
  categories: string[];
  completedSteps: string[];
  skippedSteps: string[];
}

export const AICoachFeedback: React.FC<AICoachFeedbackProps> = ({
  routineName,
  duration,
  categories,
  completedSteps,
  skippedSteps
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateFeedback = async () => {
      try {
        setLoading(true);
        
        const { data } = await supabase.functions.invoke('routine-coach-feedback', {
          body: {
            routineName,
            duration,
            categories,
            completedSteps,
            skippedSteps
          }
        });

        if (data?.feedback) {
          setFeedback(data.feedback);
        } else {
          // Fallback feedback
          setFeedback(`Amazing work completing ${routineName}! Your dedication to fitness is truly inspiring. Keep up the fantastic effort! 💪`);
        }
      } catch (error) {
        console.error('Error generating AI feedback:', error);
        setFeedback(`Fantastic job finishing today's workout! Every step forward brings you closer to your goals. 🌟`);
      } finally {
        setLoading(false);
      }
    };

    generateFeedback();
  }, [routineName, duration, categories, completedSteps, skippedSteps]);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                AI Coach Feedback
              </span>
            </div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">
                {feedback}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};