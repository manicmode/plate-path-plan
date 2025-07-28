import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekData {
  week: number;
  completedWorkouts: number;
  totalMinutes: number;
  days: Array<{
    isRestDay: boolean;
    isCompleted: boolean;
  }>;
}

interface WeekSelectorProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  weekData: WeekData[];
}

export const WeekSelector = ({ selectedWeek, onWeekChange, weekData }: WeekSelectorProps) => {
  const getWeekStatus = (week: number) => {
    const data = weekData.find(w => w.week === week);
    if (!data) return { completed: 0, total: 0, percentage: 0 };
    
    const totalWorkouts = data.days.filter(d => !d.isRestDay).length;
    const percentage = totalWorkouts > 0 ? (data.completedWorkouts / totalWorkouts) * 100 : 0;
    
    return {
      completed: data.completedWorkouts,
      total: totalWorkouts,
      percentage
    };
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Week {selectedWeek}</h2>
          <p className="text-sm text-muted-foreground">of 8</p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(Math.min(8, selectedWeek + 1))}
          disabled={selectedWeek === 8}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Progress Indicators */}
      <div className="flex justify-center gap-2 flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => {
          const status = getWeekStatus(week);
          const isSelected = week === selectedWeek;
          const isCompleted = status.percentage === 100;
          
          return (
            <Button
              key={week}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onWeekChange(week)}
              className={`min-w-12 relative ${
                isCompleted ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' : ''
              } ${
                isSelected && !isCompleted ? 'bg-primary' : ''
              }`}
            >
              {week}
              {status.completed > 0 && (
                <Badge 
                  variant="secondary" 
                  className={`absolute -top-1 -right-1 h-4 w-4 p-0 text-xs rounded-full ${
                    isCompleted ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'
                  }`}
                >
                  {status.completed}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Current Week Status */}
      <div className="text-center">
        {(() => {
          const status = getWeekStatus(selectedWeek);
          if (status.percentage === 100) {
            return (
              <Badge className="bg-green-500 text-white">
                ✅ Week {selectedWeek} Complete!
              </Badge>
            );
          } else if (status.completed > 0) {
            return (
              <Badge variant="secondary">
                🔥 {status.completed}/{status.total} workouts done
              </Badge>
            );
          } else {
            return (
              <Badge variant="outline">
                💪 {status.total} workouts planned
              </Badge>
            );
          }
        })()}
      </div>
    </div>
  );
};