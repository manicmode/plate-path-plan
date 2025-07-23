import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/auth';
import { Plus, Dumbbell, Droplet, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@radix-ui/react-icons';
import { ExerciseLogForm, ExerciseData } from '@/components/ExerciseLogForm';
import { HydrationForm } from '@/components/HydrationForm';
import { SupplementLogForm } from '@/components/SupplementLogForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { DailyNutritionSummary } from '@/components/analytics/DailyNutritionSummary';
import { NetCaloriesCard } from '@/components/analytics/NetCaloriesCard';
import { DailyTargetsCard } from '@/components/profile/DailyTargetsCard';
import { StepsCard } from '@/components/analytics/StepsCard';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CalorieData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderWidth: number;
  }[];
}

export default function Home() {
  const { user, dailyCalories, dailyProtein, dailyCarbs, dailyFat, dailyHydration, dailySupplements } = useAuth();
  const isMobile = useIsMobile();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showHydrationForm, setShowHydrationForm] = useState(false);
  const [showSupplementForm, setShowSupplementForm] = useState(false);
  const [totalExerciseMinutes, setTotalExerciseMinutes] = useState(0);
  const [totalHydrationOz, setTotalHydrationOz] = useState(0);
  const [totalSupplementsTaken, setTotalSupplementsTaken] = useState(0);

  useEffect(() => {
    // Calculate total exercise minutes
    const exerciseMinutes = dailyCalories?.reduce((acc, item) => acc + (item.exercise_minutes || 0), 0) || 0;
    setTotalExerciseMinutes(exerciseMinutes);

    // Calculate total hydration in ounces
    const hydrationOz = dailyHydration?.reduce((acc, item) => acc + (item.hydration_oz || 0), 0) || 0;
    setTotalHydrationOz(hydrationOz);

    // Calculate total supplements taken
    const supplementsTaken = dailySupplements?.length || 0;
    setTotalSupplementsTaken(supplementsTaken);
  }, [dailyCalories, dailyHydration, dailySupplements]);

  const calorieData: CalorieData = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [
      {
        label: 'grams',
        data: [dailyProtein, dailyCarbs, dailyFat],
        backgroundColor: ['#2563eb', '#16a34a', '#dc2626'],
        borderWidth: 0,
      },
    ],
  };

  const formatDateForDisplay = (date: Date | undefined): string => {
    return date ? format(date, 'PPP') : 'Select a date';
  };

  const handleExerciseSubmit = (data: ExerciseData) => {
    // Handle exercise data submission
    console.log('Exercise data submitted:', data);
  };

  const handleHydrationSubmit = () => {
    // Handle hydration data submission
    console.log('Hydration data submitted');
  };

  const handleSupplementSubmit = () => {
    // Handle supplement data submission
    console.log('Supplement data submitted');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting Section */}
      <div className="text-center">
        <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-extrabold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent mb-2`}>
          {user ? `Welcome back, ${user.name}!` : 'Welcome!'}
        </h1>
        <p className={`text-emerald-600 dark:text-emerald-400 font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
          Track your progress and achieve your goals
        </p>
      </div>

      {/* Daily Targets Card */}
      <DailyTargetsCard />

      {/* Net Calories Card */}
      <NetCaloriesCard />

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Steps Card */}
        <StepsCard />

        {/* Exercise Card */}
        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-95 glass-card border-0"
          onClick={() => setShowExerciseForm(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-sm font-medium">Exercise</span>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalExerciseMinutes}</p>
            <p className="text-xs text-muted-foreground">min today</p>
          </CardContent>
        </Card>

        {/* Hydration Card */}
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-95 glass-card border-0"
          onClick={() => setShowHydrationForm(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Droplet className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Hydration</span>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalHydrationOz}</p>
            <p className="text-xs text-muted-foreground">oz today</p>
          </CardContent>
        </Card>

        {/* Supplements Card */}
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-95 glass-card border-0"
          onClick={() => setShowSupplementForm(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Pill className="w-4 h-4 text-purple-500" />
                </div>
                <span className="text-sm font-medium">Supplements</span>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{totalSupplementsTaken}</p>
            <p className="text-xs text-muted-foreground">taken today</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Nutrition Summary */}
      <DailyNutritionSummary />

      {/* Exercise Log Form Dialog */}
      <ExerciseLogForm isOpen={showExerciseForm} onClose={() => setShowExerciseForm(false)} onSubmit={handleExerciseSubmit} />

      {/* Hydration Form Dialog */}
      <HydrationForm isOpen={showHydrationForm} onClose={() => setShowHydrationForm(false)} onSubmit={handleHydrationSubmit} />

      {/* Supplement Log Form Dialog */}
      <SupplementLogForm isOpen={showSupplementForm} onClose={() => setShowSupplementForm(false)} onSubmit={handleSupplementSubmit} />
    </div>
  );
}
