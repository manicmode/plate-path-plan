import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface TestProfile {
  name: string;
  age: number;
  gender: string;
  weight: number;
  height_cm: number;
  activity_level: string;
  weight_goal_type: string;
  health_conditions: string[];
  diet_styles: string[];
}

interface TargetResult {
  profile: TestProfile;
  targets: any;
  error?: string;
}

const TEST_PROFILES: TestProfile[] = [
  {
    name: "Young Active Male",
    age: 25,
    gender: "male",
    weight: 70,
    height_cm: 180,
    activity_level: "very_active",
    weight_goal_type: "gain_weight",
    health_conditions: [],
    diet_styles: []
  },
  {
    name: "Middle-aged Female (Weight Loss)",
    age: 45,
    gender: "female", 
    weight: 75,
    height_cm: 165,
    activity_level: "moderate",
    weight_goal_type: "lose_weight",
    health_conditions: ["diabetes"],
    diet_styles: ["low_carb"]
  },
  {
    name: "Senior Sedentary Male",
    age: 65,
    gender: "male",
    weight: 80,
    height_cm: 175,
    activity_level: "sedentary",
    weight_goal_type: "maintain",
    health_conditions: ["hypertension", "high_cholesterol"],
    diet_styles: []
  },
  {
    name: "Young Vegan Female",
    age: 28,
    gender: "female",
    weight: 60,
    height_cm: 170,
    activity_level: "light",
    weight_goal_type: "maintain",
    health_conditions: [],
    diet_styles: ["vegan"]
  }
];

export const DailyTargetsTestSuite = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TargetResult[]>([]);

  const runTargetCalculationTest = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to run this test');
      return;
    }

    setIsRunning(true);
    setResults([]);
    
    try {
      const testResults: TargetResult[] = [];
      
      for (const profile of TEST_PROFILES) {
        try {
          console.log(`Testing profile: ${profile.name}`);
          
          // Call the edge function directly with test profile data
          const { data, error } = await supabase.functions.invoke('calculate-daily-targets', {
            body: { 
              userId: user.id,
              testProfile: profile // Pass test profile instead of using DB profile
            }
          });

          if (error) {
            throw error;
          }

          testResults.push({
            profile,
            targets: data?.targets || data,
            error: data?.error
          });
          
        } catch (error) {
          console.error(`Error testing profile ${profile.name}:`, error);
          testResults.push({
            profile,
            targets: null,
            error: error.message
          });
        }
      }
      
      setResults(testResults);
      toast.success(`Test completed! Generated ${testResults.filter(r => !r.error).length}/${testResults.length} target profiles`);
      
    } catch (error) {
      console.error('Error running target calculation test:', error);
      toast.error('Failed to run target calculation test');
    } finally {
      setIsRunning(false);
    }
  };

  const formatTargets = (targets: any) => {
    if (!targets) return 'No targets generated';
    
    return {
      calories: Math.round(targets.calories || 0),
      protein: Math.round((targets.protein || 0) * 10) / 10,
      carbs: Math.round((targets.carbs || 0) * 10) / 10,
      fat: Math.round((targets.fat || 0) * 10) / 10,
      fiber: Math.round((targets.fiber || 0) * 10) / 10,
      hydration_ml: Math.round(targets.hydration_ml || targets.hydrationMl || 0),
      supplement_count: targets.supplement_count || targets.supplementCount || 0
    };
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Daily Targets Calculation Test Suite</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test target generation with different user profiles to verify personalization
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTargetCalculationTest}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Tests...' : 'Run Target Calculation Tests'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result, index) => (
                <Card key={index} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{result.profile.name}</CardTitle>
                      <Badge variant={result.error ? "destructive" : "default"}>
                        {result.error ? "Failed" : "Success"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Age: {result.profile.age}, Gender: {result.profile.gender}</div>
                      <div>Weight: {result.profile.weight}kg, Activity: {result.profile.activity_level}</div>
                      <div>Goal: {result.profile.weight_goal_type}</div>
                      {result.profile.health_conditions.length > 0 && (
                        <div>Conditions: {result.profile.health_conditions.join(', ')}</div>
                      )}
                      {result.profile.diet_styles.length > 0 && (
                        <div>Diet: {result.profile.diet_styles.join(', ')}</div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {result.error ? (
                      <div className="text-sm text-destructive">{result.error}</div>
                    ) : (
                      <div className="text-xs space-y-1">
                        {Object.entries(formatTargets(result.targets)).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-mono">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary comparison */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Target Comparison Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div className="font-medium">Calories Range:</div>
                  <div>
                    {(() => {
                      const validTargets = results.filter(r => !r.error && r.targets).map(r => formatTargets(r.targets));
                      const calories = validTargets.filter(t => typeof t === 'object' && t.calories).map(t => (t as any).calories);
                      return calories.length > 0 ? `${Math.min(...calories)} - ${Math.max(...calories)} kcal` : 'No data';
                    })()}
                  </div>
                  
                  <div className="font-medium">Protein Range:</div>
                  <div>
                    {(() => {
                      const validTargets = results.filter(r => !r.error && r.targets).map(r => formatTargets(r.targets));
                      const protein = validTargets.filter(t => typeof t === 'object' && t.protein).map(t => (t as any).protein);
                      return protein.length > 0 ? `${Math.min(...protein)} - ${Math.max(...protein)} g` : 'No data';
                    })()}
                  </div>
                  
                  <div className="font-medium">Hydration Range:</div>
                  <div>
                    {(() => {
                      const validTargets = results.filter(r => !r.error && r.targets).map(r => formatTargets(r.targets));
                      const hydration = validTargets.filter(t => typeof t === 'object' && t.hydration_ml).map(t => (t as any).hydration_ml);
                      return hydration.length > 0 ? `${Math.min(...hydration)} - ${Math.max(...hydration)} ml` : 'No data';
                    })()}
                  </div>
                  
                  <div className="mt-4 p-2 bg-background rounded text-xs">
                    ✅ Targets should vary significantly between different profiles<br/>
                    ✅ Active young male should have highest calories<br/>
                    ✅ Senior sedentary should have lowest calories<br/>
                    ✅ Females should generally have lower targets than males<br/>
                    ✅ Weight loss profiles should have reduced calories
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};