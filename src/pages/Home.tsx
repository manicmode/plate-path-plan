import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { useNutrition } from '@/contexts/NutritionContext';
import { useRealSupplementData } from '@/hooks/useRealSupplementData';
import { supabase } from '@/integrations/supabase/client';
import { 
  Utensils, 
  Droplets, 
  Pill, 
  Dumbbell,
  Plus,
  TrendingUp,
  Target,
  Calendar,
  Award
} from 'lucide-react';
import { MealLoggingModal } from '@/components/MealLoggingModal';
import { HydrationModal } from '@/components/HydrationModal';
import { SupplementListModal } from '@/components/SupplementListModal';
import { ExerciseModal } from '@/components/ExerciseModal';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    currentDay, 
    addMeal, 
    addHydration, 
    saveSupplement, 
    getTodaysProgress,
    dailyTargets 
  } = useNutrition();
  
  const { 
    todayCount: realSupplementCount, 
    todaySupplements 
  } = useRealSupplementData('7d');

  const [showMealModal, setShowMealModal] = useState(false);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  
  const isMobile = useIsMobile();
  useScrollToTop();

  const progress = getTodaysProgress();

  const handleMealLog = (mealData: any) => {
    addMeal(selectedMealType, mealData);
    setShowMealModal(false);
    toast({
      title: "Meal logged!",
      description: `${mealData.name} has been added to your ${selectedMealType}.`,
    });
  };

  const handleHydrationLog = (amount: number) => {
    addHydration(amount);
    setShowHydrationModal(false);
    toast({
      title: "Hydration logged!",
      description: `${amount}ml of water has been added to your daily intake.`,
    });
  };

  const handleSupplementLog = async (supplementData: any) => {
    try {
      // Save to database
      const { error } = await supabase
        .from('supplement_logs')
        .insert({
          user_id: user?.id,
          name: supplementData.name,
          dosage: supplementData.dosage,
          unit: supplementData.unit,
          frequency: supplementData.frequency,
          image_url: supplementData.image_url
        });

      if (error) throw error;

      // Also update local context for immediate UI update
      saveSupplement(supplementData);
      
      toast({
        title: "Supplement logged!",
        description: `${supplementData.name} has been added to your daily log.`,
      });
    } catch (error) {
      console.error('Error logging supplement:', error);
      toast({
        title: "Error",
        description: "Failed to log supplement. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExerciseLog = (exerciseData: any) => {
    // Exercise logging logic would go here
    setShowExerciseModal(false);
    toast({
      title: "Exercise logged!",
      description: `${exerciseData.name} has been added to your workout.`,
    });
  };

  const openMealModal = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedMealType(mealType);
    setShowMealModal(true);
  };

  const getCalorieGoal = () => {
    return user?.targetCalories || dailyTargets?.calories || 2000;
  };

  const getProteinGoal = () => {
    return user?.targetProtein || dailyTargets?.protein || 120;
  };

  const getHydrationGoal = () => {
    return user?.targetHydration || dailyTargets?.hydration || 8;
  };

  const getSupplementGoal = () => {
    return user?.targetSupplements || dailyTargets?.supplement_count || 3;
  };

  const calorieGoal = getCalorieGoal();
  const proteinGoal = getProteinGoal();
  const hydrationGoal = getHydrationGoal();
  const supplementGoal = getSupplementGoal();
  
  const caloriesPercentage = (progress.calories / calorieGoal) * 100;
  const proteinPercentage = (progress.protein / proteinGoal) * 100;
  const hydrationPercentage = (progress.hydration / hydrationGoal) * 100;
  
  // Use real supplement count, fallback to context if needed
  const currentSupplements = realSupplementCount || currentDay.supplements.length;
  const supplementsPercentage = (currentSupplements / supplementGoal) * 100;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {formatDate(new Date())}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {/* Daily Summary */}
        <section className="px-4 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Calories */}
            <Card className="bg-white dark:bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Utensils className="h-5 w-5 text-blue-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(progress.calories)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Calories</span>
                    <span className="text-gray-900 dark:text-white">
                      {Math.round(progress.calories)}/{calorieGoal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
                    />
                  </div>
                  {caloriesPercentage >= 100 && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                      🎯 Daily goal reached!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Protein */}
            <Card className="bg-white dark:bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(progress.protein)}g
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Protein</span>
                    <span className="text-gray-900 dark:text-white">
                      {Math.round(progress.protein)}/{proteinGoal}g
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
                    />
                  </div>
                  {proteinPercentage >= 100 && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                      🎯 Daily goal reached!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hydration */}
            <Card className="bg-white dark:bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Droplets className="h-5 w-5 text-cyan-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {progress.hydration}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Glasses</span>
                    <span className="text-gray-900 dark:text-white">
                      {progress.hydration}/{hydrationGoal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(hydrationPercentage, 100)}%` }}
                    />
                  </div>
                  {hydrationPercentage >= 100 && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                      🎯 Daily goal reached!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Supplements */}
            <Card className="bg-white dark:bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Pill className="h-5 w-5 text-pink-500" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentSupplements}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Supplements</span>
                    <span className="text-gray-900 dark:text-white">
                      {currentSupplements}/{supplementGoal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(supplementsPercentage, 100)}%` }}
                    />
                  </div>
                  {supplementsPercentage >= 100 && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                      🎯 Daily goal reached!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Meal Logging */}
        <section className="px-4 py-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Your Meals</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => (
              <Card 
                key={mealType}
                className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800/50"
                onClick={() => openMealModal(mealType)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Utensils className="h-5 w-5 text-orange-500" />
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                    {mealType}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentDay.meals[mealType]?.length || 0} items
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="px-4 py-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Hydration */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800/50"
              onClick={() => setShowHydrationModal(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Droplets className="h-6 w-6 text-cyan-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {progress.hydration}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Water</span>
                    <span className="text-gray-900 dark:text-white">
                      {progress.hydration}/{hydrationGoal} glasses
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(hydrationPercentage, 100)}%` }}
                    />
                  </div>
                  {hydrationPercentage >= 100 && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                      🎯 Daily goal reached!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Supplements */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800/50"
              onClick={() => setShowSupplementModal(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Pill className="h-6 w-6 text-pink-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentSupplements}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Supplements</span>
                    <span className="text-gray-900 dark:text-white">
                      {currentSupplements}/{supplementGoal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(supplementsPercentage, 100)}%` }}
                    />
                  </div>
                  {supplementsPercentage >= 100 && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                      🎯 Daily goal reached!
                    </div>
                  )}
                  {todaySupplements.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Recent: {todaySupplements.slice(0, 2).map(s => s.name).join(', ')}
                      {todaySupplements.length > 2 && ` +${todaySupplements.length - 2} more`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Exercise */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800/50 col-span-2"
              onClick={() => setShowExerciseModal(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Dumbbell className="h-6 w-6 text-purple-500" />
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Log Exercise</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your workouts and activities
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="px-4 py-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Progress</h2>
          <Card className="bg-white dark:bg-gray-800/50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Calories</h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(progress.calories)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(caloriesPercentage)}% of goal
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Protein</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round(progress.protein)}g
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(proteinPercentage)}% of goal
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Droplets className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Hydration</h3>
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {progress.hydration}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(hydrationPercentage)}% of goal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Meal Modal */}
      {showMealModal && (
        <MealLoggingModal
          isOpen={showMealModal}
          onClose={() => setShowMealModal(false)}
          onMealLog={handleMealLog}
          mealType={selectedMealType}
        />
      )}

      {/* Hydration Modal */}
      {showHydrationModal && (
        <HydrationModal
          isOpen={showHydrationModal}
          onClose={() => setShowHydrationModal(false)}
          onHydrationLog={handleHydrationLog}
        />
      )}

      {/* Supplement Modal */}
      {showSupplementModal && (
        <SupplementListModal
          isOpen={showSupplementModal}
          onClose={() => setShowSupplementModal(false)}
          onSupplementLog={handleSupplementLog}
        />
      )}

      {/* Exercise Modal */}
      {showExerciseModal && (
        <ExerciseModal
          isOpen={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          onExerciseLog={handleExerciseLog}
        />
      )}
    </div>
  );
}
