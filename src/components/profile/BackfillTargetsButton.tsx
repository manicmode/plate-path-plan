import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const BackfillTargetsButton = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<{
    totalUsers: number;
    usersWithoutTargets: number;
    usersWithIncompleteProfiles: number;
  } | null>(null);

  const checkStats = async () => {
    try {
      // Get total users with completed onboarding
      const { data: completedUsers, error: completedError } = await supabase
        .from('user_profiles')
        .select('user_id, onboarding_completed')
        .eq('onboarding_completed', true);

      if (completedError) {
        console.error('Error fetching completed users:', completedError);
        return;
      }

      const totalUsers = completedUsers?.length || 0;

      // Get users without targets
      const today = new Date().toISOString().split('T')[0];
      const { data: usersWithTargets, error: targetsError } = await supabase
        .from('daily_nutrition_targets')
        .select('user_id')
        .eq('target_date', today);

      if (targetsError) {
        console.error('Error fetching users with targets:', targetsError);
        return;
      }

      const userIdsWithTargets = new Set(usersWithTargets?.map(t => t.user_id) || []);
      const usersWithoutTargets = completedUsers?.filter(u => !userIdsWithTargets.has(u.user_id)).length || 0;

      // Get users with incomplete profiles (no essential data)
      const { data: incompleteUsers, error: incompleteError } = await supabase
        .from('user_profiles')
        .select('user_id, age, gender, weight, activity_level')
        .eq('onboarding_completed', true)
        .or('age.is.null,gender.is.null,weight.is.null,activity_level.is.null');

      const usersWithIncompleteProfiles = incompleteUsers?.length || 0;

      setStats({
        totalUsers,
        usersWithoutTargets,
        usersWithIncompleteProfiles
      });

    } catch (error) {
      console.error('Error checking stats:', error);
      toast.error('Failed to check user statistics');
    }
  };

  const generateAllMissingTargets = async () => {
    setIsGenerating(true);

    try {
      // Get all users with completed onboarding but no targets
      const { data: completedUsers, error: completedError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('onboarding_completed', true);

      if (completedError || !completedUsers) {
        throw new Error('Failed to fetch completed users');
      }

      // Get users who already have targets today
      const today = new Date().toISOString().split('T')[0];
      const { data: usersWithTargets, error: targetsError } = await supabase
        .from('daily_nutrition_targets')
        .select('user_id')
        .eq('target_date', today);

      if (targetsError) {
        throw new Error('Failed to fetch existing targets');
      }

      const userIdsWithTargets = new Set(usersWithTargets?.map(t => t.user_id) || []);
      const usersNeedingTargets = completedUsers.filter(u => !userIdsWithTargets.has(u.user_id));

      if (usersNeedingTargets.length === 0) {
        toast.success('All users already have daily targets!');
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Generate targets for each user
      for (const user of usersNeedingTargets) {
        try {
          const { error } = await supabase.functions.invoke('calculate-daily-targets', {
            body: { userId: user.user_id }
          });

          if (error) {
            console.error(`Failed to generate targets for user ${user.user_id}:`, error);
            failureCount++;
          } else {
            successCount++;
            console.log(`Successfully generated targets for user ${user.user_id}`);
          }
        } catch (error) {
          console.error(`Error generating targets for user ${user.user_id}:`, error);
          failureCount++;
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (successCount > 0) {
        toast.success(`Successfully generated daily targets for ${successCount} users!`);
      }
      
      if (failureCount > 0) {
        toast.error(`Failed to generate targets for ${failureCount} users. Check logs for details.`);
      }

      // Refresh stats
      await checkStats();

    } catch (error) {
      console.error('Error in generateAllMissingTargets:', error);
      toast.error('Failed to generate missing targets');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Admin: Daily Targets Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stats ? (
          <Button onClick={checkStats} variant="outline" className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Check User Statistics
          </Button>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.usersWithoutTargets}</div>
                <div className="text-sm text-muted-foreground">Missing Targets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.usersWithIncompleteProfiles}</div>
                <div className="text-sm text-muted-foreground">Incomplete Profiles</div>
              </div>
            </div>

            {stats.usersWithoutTargets > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-800 dark:text-orange-200">
                  {stats.usersWithoutTargets} users are missing daily nutrition targets
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={generateAllMissingTargets} 
                disabled={isGenerating || stats.usersWithoutTargets === 0}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Generate Missing Targets
                  </>
                )}
              </Button>
              
              <Button onClick={checkStats} variant="outline">
                Refresh
              </Button>
            </div>

            {stats.usersWithIncompleteProfiles > 0 && (
              <Badge variant="destructive" className="w-full justify-center">
                {stats.usersWithIncompleteProfiles} users have incomplete profiles and may need manual attention
              </Badge>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};