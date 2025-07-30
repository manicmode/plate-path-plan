import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GuidedWorkoutPlayer } from '@/components/workout/GuidedWorkoutPlayer';
import { useIntelligentRoutine } from '@/hooks/useIntelligentRoutine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function GuidedWorkoutPage() {
  const { week, day } = useParams<{ week: string; day: string }>();
  const navigate = useNavigate();
  const { currentRoutine, isLoading } = useIntelligentRoutine();
  const [workoutData, setWorkoutData] = useState<any>(null);

  useEffect(() => {
    if (!currentRoutine || !week || !day) return;

    const dayIndex = parseInt(day) - 1;
    
    // Access the weekly routine data structure
    if (currentRoutine.weekly_routine_data && currentRoutine.weekly_routine_data.days) {
      const dayData = currentRoutine.weekly_routine_data.days[dayIndex];
      if (dayData && !dayData.is_rest_day) {
        setWorkoutData({
          title: dayData.name || `Day ${day} Workout`,
          exercises: dayData.exercises || [],
          duration: dayData.estimated_duration || 45
        });
      }
    }
  }, [currentRoutine, week, day]);

  const handleBack = () => {
    navigate('/exercise-hub');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto text-center p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading Your Workout</h2>
          <p className="text-muted-foreground">Preparing your personalized training session...</p>
        </Card>
      </div>
    );
  }

  if (!workoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto text-center p-8">
          <h2 className="text-xl font-semibold mb-4">Workout Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find the workout you're looking for. Please check your routine or try again.
          </p>
          <Button onClick={handleBack} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exercise Hub
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <GuidedWorkoutPlayer 
      workoutData={workoutData}
      week={parseInt(week || '1')}
      day={parseInt(day || '1')}
    />
  );
}