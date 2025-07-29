import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Repeat, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/useAuth';
import { toast } from 'sonner';

interface SavedFood {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  created_at: string;
  image_url?: string;
  log_count: number;
}

interface SavedFoodsTabProps {
  onFoodSelect: (food: any) => void;
  onRefetch?: (refetchFunction: () => Promise<void>) => void;
}

export const SavedFoodsTab = ({ onFoodSelect, onRefetch }: SavedFoodsTabProps) => {
  const { user } = useAuth();
  const [optimisticFoods, setOptimisticFoods] = useState<SavedFood[]>([]);
  const [debugMode] = useState(process.env.NODE_ENV === 'development');

  console.log('🔄 SavedFoodsTab render - user?.id:', user?.id);

  // Fetch saved foods using useQuery
  const {
    data: savedFoods = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['savedFoods', user?.id],
    queryFn: async (): Promise<SavedFood[]> => {
      console.log('🚀 Starting fetchSavedFoods query for user:', user?.id);
      const startTime = performance.now();
      
      if (!user?.id) {
        console.log('❌ No user ID, throwing error to prevent query');
        throw new Error('User not authenticated');
      }

      try {
        console.log('📡 Making optimized Supabase query with limit and recent data...');
        
        // Optimized query: limit results, order by recent, select only needed fields
        const { data, error } = await supabase
          .from('nutrition_logs')
          .select(`
            id,
            food_name,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            sodium,
            image_url,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100); // Limit to recent 100 entries to prevent timeout

        const queryTime = performance.now() - startTime;
        console.log('📊 Supabase response - data length:', data?.length || 0, 'error:', error, 'time:', `${queryTime.toFixed(2)}ms`);

        if (error) {
          console.error('❌ Supabase query error:', error);
          // Only show error toast for real database/network errors
          if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            toast.error('Failed to load saved foods');
          }
          throw error;
        }

        if (!data || data.length === 0) {
          console.log('📦 No data returned, returning empty array');
          return [];
        }

        console.log('🔄 Processing', data.length, 'nutrition logs...');
        
        // Group by food name, count frequency, and keep most recent data
        const foodMap = new Map<string, SavedFood>();
        
        data.forEach(food => {
          const normalizedName = food.food_name.toLowerCase();
          const existing = foodMap.get(normalizedName);
          
          if (existing) {
            // Increment count and keep most recent data
            existing.log_count++;
            if (new Date(food.created_at) > new Date(existing.created_at)) {
              existing.id = food.id;
              existing.calories = food.calories || 0;
              existing.protein = food.protein || 0;
              existing.carbs = food.carbs || 0;
              existing.fat = food.fat || 0;
              existing.fiber = food.fiber || 0;
              existing.sugar = food.sugar || 0;
              existing.sodium = food.sodium || 0;
              existing.created_at = food.created_at;
              existing.image_url = food.image_url;
            }
          } else {
            // Add new food with initial count
            foodMap.set(normalizedName, {
              id: food.id,
              food_name: food.food_name,
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0,
              fiber: food.fiber || 0,
              sugar: food.sugar || 0,
              sodium: food.sodium || 0,
              created_at: food.created_at,
              image_url: food.image_url,
              log_count: 1
            });
          }
        });

        // Convert to array and sort by frequency (descending), then by recency
        const uniqueFoods = Array.from(foodMap.values())
          .sort((a, b) => {
            if (b.log_count !== a.log_count) {
              return b.log_count - a.log_count; // Higher frequency first
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // More recent first
          })
          .slice(0, 20); // Limit to top 20

        const processingTime = performance.now() - startTime;
        console.log('✅ Processed saved foods:', uniqueFoods.length, 'unique items, total time:', `${processingTime.toFixed(2)}ms`);
        
        // Log performance warning if query is slow
        if (processingTime > 500) {
          console.warn('⚠️ Slow query detected:', `${processingTime.toFixed(2)}ms - consider database indexing`);
        }
        
        return uniqueFoods;
      } catch (queryError) {
        console.error('💥 Query function error:', queryError);
        throw queryError;
      }
    },
    enabled: !!user?.id, // Only run query when user ID exists
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter for faster updates)
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    retry: (failureCount, error: any) => {
      console.log('🔄 Query retry attempt:', failureCount, 'error:', error?.message);
      
      // Don't retry on auth errors or timeout errors
      if (error?.message?.includes('not authenticated') || 
          error?.message?.includes('canceling statement') ||
          error?.message?.includes('timeout')) {
        console.log('❌ Not retrying due to error type:', error?.message);
        return false;
      }
      return failureCount < 2; // Reduce retry attempts to prevent long delays
    },
    // Add query timeout
    meta: {
      errorMessage: 'Failed to load saved foods'
    }
  });

  console.log('📊 Query state - isLoading:', isLoading, 'isError:', isError, 'savedFoods.length:', savedFoods.length);

  // Register refetch function with parent component
  useEffect(() => {
    if (onRefetch && refetch) {
      console.log('🔗 Registering refetch function with parent');
      onRefetch(async () => {
        console.log('🔄 Parent requested refetch');
        await refetch();
      });
    }
  }, [onRefetch, refetch]);

  // Optimistic update function
  const addFoodOptimistically = useCallback((newFood: any) => {
    console.log('⚡ Adding food optimistically:', newFood.name);
    const normalizedName = newFood.name?.toLowerCase();
    if (!normalizedName) return;

    setOptimisticFoods(prev => {
      const existingIndex = prev.findIndex(food => 
        food.food_name.toLowerCase() === normalizedName
      );
      
      if (existingIndex >= 0) {
        // Increment count for existing food
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          log_count: updated[existingIndex].log_count + 1,
          created_at: new Date().toISOString()
        };
        return updated.sort((a, b) => {
          if (b.log_count !== a.log_count) {
            return b.log_count - a.log_count;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      } else {
        // Add new food
        const newSavedFood: SavedFood = {
          id: `temp-${Date.now()}`,
          food_name: newFood.name,
          calories: newFood.calories || 0,
          protein: newFood.protein || 0,
          carbs: newFood.carbs || 0,
          fat: newFood.fat || 0,
          fiber: newFood.fiber || 0,
          sugar: newFood.sugar || 0,
          sodium: newFood.sodium || 0,
          created_at: new Date().toISOString(),
          image_url: newFood.image_url,
          log_count: 1
        };
        return [newSavedFood, ...prev].slice(0, 20);
      }
    });
  }, []);

  const handleRelogFood = (food: SavedFood) => {
    console.log('🔄 Re-logging food:', food.food_name);
    onFoodSelect({
      name: food.food_name,
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      confidence: 100,
    });
  };

  // Combine server data with optimistic updates
  const displayFoods = optimisticFoods.length > 0 ? optimisticFoods : savedFoods;

  // Show authentication loading state
  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">
            Please log in to view saved foods
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading saved foods...</p>
          {debugMode && (
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Debug: user?.id = {user?.id}</p>
              <p>Debug: isLoading = {String(isLoading)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Foods</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'Failed to load saved foods'}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Try Again
          </Button>
          {debugMode && (
            <div className="mt-4 text-xs text-left bg-destructive/5 p-2 rounded">
              <p>Debug Error: {JSON.stringify(error, null, 2)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show empty state
  if (displayFoods.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Saved Foods</h3>
        <p className="text-muted-foreground mb-4">
          Start logging foods to see them here
        </p>
        {debugMode && (
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Debug: user?.id = {user?.id}</p>
            <p>Debug: savedFoods.length = {savedFoods.length}</p>
            <p>Debug: optimisticFoods.length = {optimisticFoods.length}</p>
            <p>Debug: isLoading = {String(isLoading)}</p>
            <p>Debug: isError = {String(isError)}</p>
          </div>
        )}
      </div>
    );
  }

  // Render saved foods list
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Foods</h3>
        {debugMode && (
          <div className="text-xs text-muted-foreground">
            Debug: {displayFoods.length} foods
          </div>
        )}
      </div>
      
      {debugMode && (
        <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground mb-4">
          <p><strong>Debug Info:</strong></p>
          <p>• user?.id: {user?.id}</p>
          <p>• isLoading: {String(isLoading)}</p>
          <p>• isError: {String(isError)}</p>
          <p>• savedFoods.length: {savedFoods.length}</p>
          <p>• optimisticFoods.length: {optimisticFoods.length}</p>
          <p>• displayFoods.length: {displayFoods.length}</p>
          {error && <p>• error: {error.message}</p>}
        </div>
      )}
      
      {displayFoods.map((food) => (
        <Card key={food.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="relative">
              <Button
                onClick={() => handleRelogFood(food)}
                size="sm"
                className="absolute -top-2 -right-2 h-7 px-2 text-xs"
              >
                <Repeat className="h-3 w-3 mr-1" />
                Log Again
              </Button>
              
              <div className="pr-20">
                <h4 className="font-medium text-foreground">{food.food_name}</h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <span>{food.calories} cal</span>
                  <span>{food.protein}g protein</span>
                  <span>{food.carbs}g carbs</span>
                  <span>{food.fat}g fat</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(food.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-primary font-medium">
                    Logged {food.log_count}×
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
