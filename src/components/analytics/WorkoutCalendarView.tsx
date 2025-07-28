import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

interface WorkoutCalendarViewProps {
  className?: string;
}

const getWorkoutEmoji = (activityType: string) => {
  const emojiMap: Record<string, string> = {
    'strength': '💪',
    'cardio': '🏃‍♂️',
    'yoga': '🧘‍♀️',
    'running': '🏃‍♂️',
    'cycling': '🚴‍♂️',
    'swimming': '🏊‍♂️',
    'weightlifting': '🏋️‍♂️',
    'pilates': '🤸‍♀️',
    'dance': '💃',
    'martial_arts': '🥋',
    'crossfit': '🔥',
    'stretching': '🤲',
    'sports': '⚽',
  };
  return emojiMap[activityType.toLowerCase()] || '💪';
};

export const WorkoutCalendarView = ({ className }: WorkoutCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { exerciseData } = useRealExerciseData('30d');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkoutForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return exerciseData.find(entry => entry.date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <Card className={`shadow-lg border-border bg-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            📅 Workout Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {daysInMonth.map((date) => {
            const workout = getWorkoutForDay(date);
            const isCurrentDay = isToday(date);
            
            return (
              <div
                key={date.toISOString()}
                className={`
                  relative p-2 h-12 flex flex-col items-center justify-center rounded-md text-xs
                  ${isCurrentDay ? 'bg-primary text-primary-foreground' : ''}
                  ${workout ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' : 'hover:bg-muted/50'}
                  transition-colors cursor-pointer
                `}
              >
                <span className={`text-xs ${isCurrentDay ? 'font-bold' : ''}`}>
                  {format(date, 'd')}
                </span>
                {workout && (
                  <div className="text-lg leading-none mt-1">
                    {getWorkoutEmoji(workout.activity_type)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800"></div>
            <span>Workout Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span>💪 Strength</span>
            <span>🏃‍♂️ Cardio</span>
            <span>🧘‍♀️ Yoga</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};