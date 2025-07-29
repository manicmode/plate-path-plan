import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Thermometer, Snowflake, Flame } from 'lucide-react';
import { useRecoveryChallenge } from '@/hooks/useRecoveryChallenge';
import { useXPSystem } from '@/hooks/useXPSystem';

export function ThermotherapyTestButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { trackRecoveryActivity } = useRecoveryChallenge();
  const { awardRecoveryXP } = useXPSystem();

  const handleLogSession = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to track your thermotherapy sessions.",
          variant: "destructive",
        });
        return;
      }

      // Call the edge function to log the session
      const { data, error } = await supabase.functions.invoke('log-thermotherapy-session', {
        body: {
          user_id: user.id,
          duration_minutes: 15, // Default session duration
          session_type: 'contrast_therapy'
        }
      });

      if (error) {
        console.error('Error logging thermotherapy session:', error);
        throw error;
      }

      // Track recovery challenge progress
      await trackRecoveryActivity({
        category: 'thermotherapy',
        sessionId: data.sessionId || 'manual-log',
        completedAt: new Date().toISOString(),
        duration: 15, // Default thermotherapy session duration
        notes: 'Thermotherapy session completed'
      });

      // Award XP for thermotherapy session completion
      await awardRecoveryXP('muscle-recovery', data.sessionId || 'thermotherapy-session', 15);

      toast({
        title: "Session Logged! 🔥❄️",
        description: "Your thermotherapy session has been recorded. Keep up the great work!",
      });

    } catch (error) {
      console.error('Error logging thermotherapy session:', error);
      toast({
        title: "Error",
        description: "Failed to log session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogSession}
      disabled={loading}
      className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 hover:from-blue-700 hover:via-purple-700 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      size="lg"
    >
      <div className="flex items-center gap-2">
        <Snowflake className="h-5 w-5 text-blue-200" />
        <Thermometer className="h-5 w-5 text-white" />
        <Flame className="h-5 w-5 text-red-200" />
      </div>
      {loading ? 'Logging Session...' : 'Log Thermotherapy Session'}
    </Button>
  );
}