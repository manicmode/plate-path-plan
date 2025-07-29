import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRecoveryChallenge } from '@/hooks/useRecoveryChallenge';
import { useXPSystem } from '@/hooks/useXPSystem';

export const SleepTestButton: React.FC = () => {
  const { trackRecoveryActivity } = useRecoveryChallenge();
  const { awardRecoveryXP } = useXPSystem();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogSession = async () => {
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Please sign in to log a sleep session');
      }

      const { data, error } = await supabase.functions.invoke('log-sleep-session', {
        body: {
          user_id: user.user.id,
          duration_minutes: 30,
        }
      });

      if (error) throw error;

      // Track recovery challenge progress
      await trackRecoveryActivity({
        category: 'sleep',
        sessionId: data.sessionId || 'manual-log',
        completedAt: new Date().toISOString(),
        duration: 30, // Default sleep prep duration
        notes: 'Sleep preparation completed'
      });

      // Award XP for sleep session completion
      await awardRecoveryXP('sleep', data.sessionId || 'sleep-session', 30);

      toast({
        title: "Sleep session logged! 🌙💤",
        description: "Great job preparing for a restful night. Sweet dreams!",
      });

    } catch (error) {
      console.error('Error logging sleep session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log sleep session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogSession}
      disabled={isLoading}
      size="lg"
      className="w-full bg-gradient-to-r from-slate-700 via-blue-800 to-indigo-800 hover:from-slate-600 hover:via-blue-700 hover:to-indigo-700 text-white border-0 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25"
    >
      <div className="flex items-center space-x-2">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        <span className="font-medium">
          {isLoading ? 'Logging Session...' : 'Log Sleep Preparation 💤'}
        </span>
      </div>
    </Button>
  );
};