import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, TestTube, User, UserCheck } from 'lucide-react';

interface TestProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height_cm: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  weight_goal_type: 'lose_weight' | 'maintain_weight' | 'gain_weight';
  main_health_goal: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'eat_healthier';
  health_conditions: string[];
  diet_styles: string[];
}

const TEST_PROFILES: TestProfile[] = [
  {
    name: "Sarah - Weight Loss",
    age: 28,
    gender: 'female',
    weight: 68, // kg
    height_cm: 165,
    activity_level: 'moderate',
    weight_goal_type: 'lose_weight',
    main_health_goal: 'lose_weight',
    health_conditions: [],
    diet_styles: ['low_carb']
  },
  {
    name: "Mike - Muscle Gain",
    age: 25,
    gender: 'male',
    weight: 75, // kg  
    height_cm: 180,
    activity_level: 'very_active',
    weight_goal_type: 'gain_weight',
    main_health_goal: 'gain_muscle',
    health_conditions: [],
    diet_styles: ['high_protein']
  },
  {
    name: "Emma - Maintenance",
    age: 35,
    gender: 'female',
    weight: 58, // kg
    height_cm: 160,
    activity_level: 'light',
    weight_goal_type: 'maintain_weight', 
    main_health_goal: 'eat_healthier',
    health_conditions: ['diabetes'],
    diet_styles: ['mediterranean']
  }
];

export const NutritionTargetsTestComponent = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const testProfile = async (profile: TestProfile) => {
    setIsGenerating(true);
    try {
      console.log(`🧪 Testing profile: ${profile.name}`, profile);
      
      const { data, error } = await supabase.functions.invoke('calculate-daily-targets', {
        body: { 
          testProfile: profile
        }
      });

      if (error) {
        console.error('❌ Error testing profile:', error);
        toast.error(`Failed to test ${profile.name}: ${error.message}`);
        return;
      }

      console.log(`✅ Results for ${profile.name}:`, data);
      setResults(prev => ({
        ...prev,
        [profile.name]: data
      }));
      
      toast.success(`Generated targets for ${profile.name}`);
    } catch (error) {
      console.error('❌ Test failed:', error);
      toast.error(`Test failed for ${profile.name}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const testAllProfiles = async () => {
    setResults({});
    for (const profile of TEST_PROFILES) {
      await testProfile(profile);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Nutrition Targets Test Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testAllProfiles}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            Test All Profiles
          </Button>
          
          {TEST_PROFILES.map((profile) => (
            <Button
              key={profile.name}
              variant="outline"
              size="sm"
              onClick={() => testProfile(profile)}
              disabled={isGenerating}
              className="flex items-center gap-1"
            >
              <User className="w-3 h-3" />
              {profile.name.split(' - ')[0]}
            </Button>
          ))}
        </div>

        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Test Results:</h3>
            
            {Object.entries(results).map(([profileName, result]) => (
              <Card key={profileName} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{profileName}</CardTitle>
                </CardHeader>
                <CardContent>
                  {result ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{Math.round(result.calories || 0)}</div>
                        <div className="text-xs text-muted-foreground">Calories</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{Math.round(result.protein || 0)}g</div>
                        <div className="text-xs text-muted-foreground">Protein</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{Math.round(result.carbs || 0)}g</div>
                        <div className="text-xs text-muted-foreground">Carbs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-yellow-600">{Math.round(result.fat || 0)}g</div>
                        <div className="text-xs text-muted-foreground">Fat</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">{Math.round(result.fiber || 0)}g</div>
                        <div className="text-xs text-muted-foreground">Fiber</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-cyan-600">{Math.round(result.hydration || 0)}</div>
                        <div className="text-xs text-muted-foreground">Glasses H₂O</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">{Math.round(result.bmr || 0)}</div>
                        <div className="text-xs text-muted-foreground">BMR</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-indigo-600">{Math.round(result.tdee || 0)}</div>
                        <div className="text-xs text-muted-foreground">TDEE</div>
                      </div>
                    </div>
                  ) : (
                    <Badge variant="destructive">Failed to generate</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};