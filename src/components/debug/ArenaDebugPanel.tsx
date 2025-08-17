import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ArenaDebugPanel() {
  const [isLoading, setIsLoading] = useState(false);

  const awardPointsAndRecompute = async () => {
    setIsLoading(true);
    try {
      // 1) Give yourself a point
      console.log('Awarding 1 point...');
      const { error: awardError } = await supabase.rpc('arena_debug_award_points', { 
        p_points: 1, 
        p_note: 'ui test' 
      });

      if (awardError) {
        console.error('Error awarding points:', awardError);
        toast.error('Failed to award points: ' + awardError.message);
        return;
      }

      // 2) Try to recompute + refresh (if function exists)
      console.log('Attempting to recompute billboard...');
      try {
        const { error: recomputeError } = await supabase.rpc('arena_recompute_and_refresh', {});
        if (recomputeError) {
          console.log('arena_recompute_and_refresh not available:', recomputeError.message);
          toast.success('Point awarded! (Billboard may update shortly)');
        } else {
          toast.success('Point awarded and billboard refreshed!');
        }
      } catch (err) {
        console.log('Recompute function not available, point still awarded');
        toast.success('Point awarded! (Billboard refresh function not available)');
      }

    } catch (err) {
      console.error('Error in debug operation:', err);
      toast.error('Failed to award points');
    } finally {
      setIsLoading(false);
    }
  };

  const checkArenaEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('arena_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        toast.error('Failed to check arena events: ' + error.message);
        return;
      }

      console.log('Recent arena events:', data);
      toast.success(`Found ${data.length} recent arena events (check console for details)`);
    } catch (err) {
      console.error('Error checking arena events:', err);
      toast.error('Failed to check arena events');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">🏆 Arena Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            onClick={awardPointsAndRecompute}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : '+1 Point & Recompute'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Awards 1 point to current user and refreshes leaderboard
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            variant="outline"
            onClick={checkArenaEvents}
            className="w-full"
          >
            Check Arena Events
          </Button>
          <p className="text-xs text-muted-foreground">
            View recent arena events in console
          </p>
        </div>

        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          <strong>Test Steps:</strong><br />
          1. Click "+1 Point & Recompute"<br />
          2. Check Arena Billboard<br />
          3. Should show you with 1 point at rank 1
        </div>
      </CardContent>
    </Card>
  );
}