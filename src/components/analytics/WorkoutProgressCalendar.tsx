import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { getAwardConfig } from '@/hooks/useWorkoutTrophy';

interface WorkoutDay {
  date: string;
  hasWorkout: boolean;
  workoutCount: number;
}

interface MonthlyProgress {
  year: number;
  month: number;
  workoutDays: WorkoutDay[];
  totalWorkouts: number;
  awardLevel: 'gold' | 'silver' | 'bronze' | 'none';
}

interface WorkoutProgressCalendarProps {
  className?: string;
}

export const WorkoutProgressCalendar = ({ className }: WorkoutProgressCalendarProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getAwardLevel = (workoutCount: number): 'gold' | 'silver' | 'bronze' | 'none' => {
    if (workoutCount >= 16) return 'gold';
    if (workoutCount >= 12) return 'silver';
    if (workoutCount >= 8) return 'bronze';
    return 'none';
  };

  const fetchMonthlyData = async (year: number, month: number) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const { data: workouts, error } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startOfMonth.toISOString())
        .lte('completed_at', endOfMonth.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Create calendar grid for the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const workoutsByDate: { [key: string]: number } = {};

      // Count workouts per day
      workouts?.forEach(workout => {
        const date = new Date(workout.completed_at).toDateString();
        workoutsByDate[date] = (workoutsByDate[date] || 0) + 1;
      });

      // Create workout days array
      const workoutDays: WorkoutDay[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateString = date.toDateString();
        const workoutCount = workoutsByDate[dateString] || 0;
        
        workoutDays.push({
          date: dateString,
          hasWorkout: workoutCount > 0,
          workoutCount
        });
      }

      const totalWorkouts = workouts?.length || 0;
      const awardLevel = getAwardLevel(totalWorkouts);

      setMonthlyProgress({
        year,
        month,
        workoutDays,
        totalWorkouts,
        awardLevel
      });
    } catch (error) {
      console.error('Error fetching monthly workout data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchMonthlyData(year, month);
  }, [currentDate, user?.id]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayClasses = (workoutDay: WorkoutDay) => {
    const baseClasses = "h-8 w-8 flex items-center justify-center text-xs font-medium rounded-full transition-all duration-200";
    
    if (workoutDay.hasWorkout) {
      if (workoutDay.workoutCount >= 2) {
        return `${baseClasses} bg-green-500 text-white shadow-lg transform scale-110`;
      } else {
        return `${baseClasses} bg-green-400 text-white shadow-md`;
      }
    } else {
      const date = new Date(workoutDay.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date > today) {
        return `${baseClasses} text-muted-foreground bg-muted/30`;
      } else {
        return `${baseClasses} text-muted-foreground bg-muted hover:bg-muted/70`;
      }
    }
  };

  const getMotivationalMessage = () => {
    if (!monthlyProgress) return "";
    
    const { awardLevel, totalWorkouts } = monthlyProgress;
    const currentMonth = new Date(currentDate).toLocaleString('default', { month: 'long' });
    
    switch (awardLevel) {
      case 'gold':
        return `🔥 Outstanding ${currentMonth}! You've earned Gold with ${totalWorkouts} workouts!`;
      case 'silver':
        return `⭐ Excellent ${currentMonth}! Silver achievement with ${totalWorkouts} workouts!`;
      case 'bronze':
        return `💪 Great ${currentMonth}! Bronze level with ${totalWorkouts} workouts completed!`;
      default:
        const remaining = Math.max(0, 8 - totalWorkouts);
        if (totalWorkouts >= 5) {
          return `🚀 You're doing great! Just ${remaining} more workouts for Bronze!`;
        } else if (totalWorkouts >= 1) {
          return `💪 Good start! Keep it up - ${remaining} more workouts for Bronze!`;
        } else {
          return `🎯 Ready to start your fitness journey in ${currentMonth}?`;
        }
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Monthly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-md"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-8 w-8 bg-muted rounded-full"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!monthlyProgress) return null;

  const awardConfig = getAwardConfig(monthlyProgress.awardLevel);
  const monthName = new Date(currentDate).toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startingDay = firstDayOfMonth.getDay(); // 0 = Sunday

  // Create calendar grid with empty cells for days from previous month
  const calendarGrid = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDay; i++) {
    calendarGrid.push(null);
  }
  
  // Add actual days of the month
  calendarGrid.push(...monthlyProgress.workoutDays);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className={`${className} border-2 ${awardConfig.borderColor} ${awardConfig.bgColor}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Monthly Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[140px] text-center">
              {monthName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Award Badge */}
        <div className="flex items-center justify-center">
          <Badge 
            variant="outline" 
            className={`${awardConfig.bgColor} ${awardConfig.textColor} border-current flex items-center gap-2 px-3 py-1`}
          >
            <span className="text-lg">{awardConfig.emoji}</span>
            <span className="font-semibold">{awardConfig.title}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-xs font-medium text-muted-foreground text-center p-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((workoutDay, index) => (
            <div key={index} className="flex justify-center">
              {workoutDay ? (
                <div
                  className={getDayClasses(workoutDay)}
                  title={`${new Date(workoutDay.date).getDate()} - ${workoutDay.workoutCount} workout${workoutDay.workoutCount !== 1 ? 's' : ''}`}
                >
                  {new Date(workoutDay.date).getDate()}
                </div>
              ) : (
                <div className="h-8 w-8"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Monthly Summary */}
        <div className={`p-3 rounded-lg ${awardConfig.bgColor} border ${awardConfig.borderColor} space-y-2`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">This Month:</span>
            <span className="text-lg font-bold">{monthlyProgress.totalWorkouts} workouts</span>
          </div>
          
          <p className="text-sm text-center font-medium">
            {getMotivationalMessage()}
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
            <span>1 workout</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <span>2+ workouts</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-muted rounded-full"></div>
            <span>No workout</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};