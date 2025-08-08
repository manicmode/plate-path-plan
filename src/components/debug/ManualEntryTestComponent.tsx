import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNutritionPersistence } from '@/hooks/useNutritionPersistence';
import { supabase } from '@/integrations/supabase/client';

export const ManualEntryTestComponent = () => {
  const { saveFood } = useNutritionPersistence();
  const [testFood, setTestFood] = useState('2 eggs and 1 avocado');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const testManualEntry = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      console.log('🧪 [Test] Starting manual entry test for:', testFood);
      
      // Step 1: Test the gpt-nutrition-estimator function
      console.log('🧪 [Test] Step 1: Calling gpt-nutrition-estimator...');
      const { data, error } = await supabase.functions.invoke('gpt-nutrition-estimator', {
        body: {
          foodName: testFood,
          amountPercentage: 100,
          mealType: 'test'
        }
      });

      if (error) {
        console.error('🧪 [Test] GPT estimation failed:', error);
        toast.error('GPT estimation failed: ' + error.message);
        setLastResult({ step: 'gpt-estimation', error: error.message });
        return;
      }

      if (!data?.nutrition) {
        console.error('🧪 [Test] No nutrition data received:', data);
        toast.error('No nutrition data received');
        setLastResult({ step: 'gpt-estimation', error: 'No nutrition data' });
        return;
      }

      console.log('🧪 [Test] GPT estimation successful:', data);

      // Step 2: Test the food data creation
      const { nutrition } = data;
      const foodData = {
        id: `test-manual-${Date.now()}`,
        name: testFood,
        calories: Math.round(nutrition.calories),
        protein: Math.round(nutrition.protein * 10) / 10,
        carbs: Math.round(nutrition.carbs * 10) / 10,
        fat: Math.round(nutrition.fat * 10) / 10,
        fiber: Math.round(nutrition.fiber * 10) / 10,
        sugar: Math.round(nutrition.sugar * 10) / 10,
        sodium: Math.round(nutrition.sodium),
        saturated_fat: Math.round(nutrition.saturated_fat * 10) / 10,
        confidence: Math.round(nutrition.confidence),
        timestamp: new Date(),
        confirmed: true,
        image: undefined,
        source: 'test'
      };

      console.log('🧪 [Test] Step 2: Created food data object:', foodData);

      // Step 3: Test the database save
      console.log('🧪 [Test] Step 3: Saving to database...');
      const savedId = await saveFood(foodData);
      
      if (!savedId) {
        console.error('🧪 [Test] Database save failed - no ID returned');
        toast.error('Database save failed - no ID returned');
        setLastResult({ step: 'database-save', error: 'No ID returned from saveFood' });
        return;
      }

      console.log('🧪 [Test] Database save successful, ID:', savedId);

      // Step 4: Test retrieval
      console.log('🧪 [Test] Step 4: Testing retrieval...');
      const { data: retrievedData, error: retrieveError } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('id', savedId)
        .single();

      if (retrieveError) {
        console.error('🧪 [Test] Retrieval failed:', retrieveError);
        toast.error('Retrieval failed: ' + retrieveError.message);
        setLastResult({ 
          step: 'retrieval', 
          error: retrieveError.message,
          savedId,
          gptData: data,
          foodData 
        });
        return;
      }

      console.log('🧪 [Test] Retrieval successful:', retrievedData);
      
      const result = {
        step: 'complete',
        savedId,
        gptData: data,
        foodData,
        retrievedData,
        success: true
      };
      
      setLastResult(result);
      toast.success(`✅ Full test successful! Item saved with ID: ${savedId}`);

    } catch (error) {
      console.error('🧪 [Test] Critical error:', error);
      toast.error('Test failed: ' + (error as Error).message);
      setLastResult({ 
        step: 'critical-error', 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Manual Entry Flow Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Food Input:</label>
          <Input
            value={testFood}
            onChange={(e) => setTestFood(e.target.value)}
            placeholder="Enter food to test..."
          />
        </div>
        
        <Button 
          onClick={testManualEntry} 
          disabled={isLoading || !testFood.trim()}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Run Full Manual Entry Test'}
        </Button>

        {lastResult && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">Last Test Result:</h3>
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};