import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const StretchingTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogSession = async () => {
    setIsLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Please sign in to log a stretching session');
      }

      const { data, error } = await supabase.functions.invoke('log-stretching-session', {
        body: {
          user_id: user.user.id,
          duration_minutes: 15,
        }
      });

      if (error) throw error;

      toast({
        title: "Stretching session logged! 🤸⚡",
        description: "Great job staying flexible and taking care of your body!",
      });

    } catch (error) {
      console.error('Error logging stretching session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log stretching session",
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
      className="w-full bg-gradient-to-r from-orange-700 via-amber-800 to-yellow-800 hover:from-orange-600 hover:via-amber-700 hover:to-yellow-700 text-white border-0 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/25"
    >
      <div className="flex items-center space-x-2">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Activity className="h-5 w-5" />
        )}
        <span className="font-medium">
          {isLoading ? 'Logging Session...' : 'Log Stretching Session 🤸'}
        </span>
      </div>
    </Button>
  );
};