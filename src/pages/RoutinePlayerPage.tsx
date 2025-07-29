import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { RoutinePlayer } from '@/components/workout/RoutinePlayer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function RoutinePlayerPage() {
  const { week, day } = useParams();
  const { user } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkoutData();
  }, [week, day, user?.id]);

  const loadWorkoutData = async () => {
    if (!user?.id || !week || !day) return;

    try {
      setIsLoading(true);
      
      const { data: routine, error } = await supabase
        .from('ai_routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !routine) {
        console.error('Error loading routine:', error);
        return;
      }

      // Extract workout data for the specific week and day
      const weekNum = parseInt(week);
      const dayNum = parseInt(day);
      const routineData = routine.routine_data as any;
      const workoutData = routineData?.weeks?.[weekNum - 1]?.days?.[dayNum - 1];

      if (workoutData && !workoutData.isRestDay) {
        setWorkout(workoutData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Loading Workout...</h2>
            <p className="text-muted-foreground">Please wait while we prepare your routine.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RoutinePlayer 
      week={parseInt(week || '1')} 
      day={parseInt(day || '1')} 
      workout={workout} 
    />
  );
}