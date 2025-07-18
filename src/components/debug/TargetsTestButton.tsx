import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TargetsTestButton = () => {
  const { user } = useAuth();
  const [isTestingComplete, setIsTestingComplete] = useState(false);
  const [testResults, setTestResults] = useState<{
    profileComplete: boolean;
    targetsGenerated: boolean;
    errorMessage?: string;
  } | null>(null);

  const runCompleteTest = async () => {
    if (!user?.id) {
      toast.error('No user found');
      return;
    }

    setIsTestingComplete(true);
    setTestResults(null);

    try {
      console.log('🧪 Starting complete targets test...');

      // Step 1: Update profile with complete data to simulate onboarding completion
      const testProfileData = {
        user_id: user.id,
        age: 30,
        gender: 'male',
        weight: 180,
        height_cm: 175,
        activity_level: 'moderate',
        main_health_goal: 'maintain_weight',
        weight_goal_type: 'maintain_weight',
        onboarding_completed: true,
        onboarding_skipped: false,
        updated_at: new Date().toISOString()
      };

      console.log('📝 Updating profile with test data...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(testProfileData, { onConflict: 'user_id' });

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      console.log('✅ Profile updated successfully');

      // Step 2: Generate daily targets
      console.log('🎯 Generating daily targets...');
      const { data: targetsData, error: targetsError } = await supabase.functions.invoke('calculate-daily-targets', {
        body: { userId: user.id }
      });

      if (targetsError) {
        throw new Error(`Targets generation failed: ${targetsError.message}`);
      }

      console.log('✅ Daily targets generated:', targetsData);

      // Step 3: Verify targets were saved
      const today = new Date().toISOString().split('T')[0];
      const { data: savedTargets, error: verifyError } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .maybeSingle();

      if (verifyError) {
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      if (!savedTargets) {
        throw new Error('Targets were not saved to database');
      }

      console.log('✅ Targets verified in database:', savedTargets);

      setTestResults({
        profileComplete: true,
        targetsGenerated: true
      });

      toast.success('🎉 Complete test passed! Daily nutrition targets are working correctly.');

    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({
        profileComplete: false,
        targetsGenerated: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingComplete(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Test Daily Targets Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will test the complete flow: update profile with complete data → generate daily targets → verify storage.
        </p>
        
        <Button 
          onClick={runCompleteTest} 
          disabled={isTestingComplete}
          className="w-full"
        >
          {isTestingComplete ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4 mr-2" />
              Run Complete Test
            </>
          )}
        </Button>

        {testResults && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-2 rounded ${testResults.profileComplete ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {testResults.profileComplete ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">Profile Update: {testResults.profileComplete ? 'Success' : 'Failed'}</span>
            </div>
            
            <div className={`flex items-center gap-2 p-2 rounded ${testResults.targetsGenerated ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {testResults.targetsGenerated ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">Targets Generation: {testResults.targetsGenerated ? 'Success' : 'Failed'}</span>
            </div>

            {testResults.errorMessage && (
              <div className="p-2 bg-red-50 text-red-800 rounded text-xs">
                Error: {testResults.errorMessage}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};