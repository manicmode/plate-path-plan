import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export function NudgeQADashboard() {
  const { user } = useAuth();
  const [ptTime, setPtTime] = useState<string>('');
  const [localStorageData, setLocalStorageData] = useState<any>({});
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [isInWindow, setIsInWindow] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pt = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
      setPtTime(pt.toLocaleTimeString());
      
      const hour = pt.getHours();
      setIsInWindow(hour >= 19 && hour < 24);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.id) {
      const checkLocalStorage = () => {
        const activeNudges = localStorage.getItem(`active_nudges_${user.id}`);
        const shownRunIds = localStorage.getItem(`shown_runids_${user.id}`);
        
        setLocalStorageData({
          activeNudges: activeNudges ? JSON.parse(activeNudges) : [],
          shownRunIds: shownRunIds ? JSON.parse(shownRunIds) : []
        });
      };
      
      checkLocalStorage();
      const interval = setInterval(checkLocalStorage, 2000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const queryTodaysEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('nudge_events')
        .select('*')
        .gte('ts', new Date(new Date().toDateString()).toISOString())
        .order('ts', { ascending: false });
      
      if (!error) {
        setDbEvents(data || []);
      }
    } catch (error) {
      console.error('Error querying events:', error);
    }
  };

  const simulateStressContext = async () => {
    console.log("🧠 Simulating stress context for breathing nudge eligibility");
    
    // This would normally create mood logs with stress tags
    alert("In a real scenario, this would create mood logs with 'stressed', 'anxious', or 'overwhelmed' tags");
  };

  const logCurrentState = () => {
    const evidence = {
      ptTime,
      isInWindow,
      localStorageData,
      recentEvents: dbEvents.slice(0, 5),
      timestamp: new Date().toISOString()
    };
    
    console.log("📊 Current QA State:", JSON.stringify(evidence, null, 2));
    return evidence;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Real-Time QA Dashboard
            <Badge variant={isInWindow ? "default" : "secondary"}>
              {isInWindow ? "In Window" : "Outside Window"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">PT Time</h4>
              <p className="text-2xl font-mono">{ptTime}</p>
              <p className="text-sm text-muted-foreground">
                Daily Check-In Window: 19:00-24:00
              </p>
            </div>
            <div>
              <h4 className="font-medium">Window Status</h4>
              <p className={`text-lg font-medium ${isInWindow ? 'text-green-600' : 'text-red-600'}`}>
                {isInWindow ? '✅ Active' : '❌ Inactive'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>localStorage Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Active Nudges ({localStorageData.activeNudges?.length || 0})</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">
                {JSON.stringify(localStorageData.activeNudges, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium">Shown Run IDs ({localStorageData.shownRunIds?.length || 0})</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">
                {JSON.stringify(localStorageData.shownRunIds, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Events (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button onClick={queryTodaysEvents} size="sm">
              Refresh Events
            </Button>
            <div className="max-h-40 overflow-auto">
              {dbEvents.map((event, i) => (
                <div key={i} className="text-xs border-b pb-1 mb-1">
                  <span className="font-mono">{event.run_id?.slice(-8)}</span> - 
                  <span className="ml-1">{event.nudge_id}</span> - 
                  <span className="ml-1 font-medium">{event.event}</span> - 
                  <span className="ml-1 text-muted-foreground">
                    {new Date(event.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QA Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={logCurrentState} className="w-full">
            📊 Log Current State to Console
          </Button>
          <Button onClick={simulateStressContext} variant="outline" className="w-full">
            🧠 Simulate Stress Context
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="w-full"
          >
            🔄 Hard Reload (Test Persistence)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Evidence Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="window-check" />
              <label htmlFor="window-check">Daily Check-In visible at 23:00 and 23:55 PT</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="no-duplicate" />
              <label htmlFor="no-duplicate">No duplicate 'shown' logs for same runId</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="persistence" />
              <label htmlFor="persistence">localStorage persistence across reloads</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="breathing" />
              <label htmlFor="breathing">Breathing nudge with stress eligibility</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="max-two" />
              <label htmlFor="max-two">Max 2 nudges concurrent</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="boundary" />
              <label htmlFor="boundary">Window boundary refresh firing</label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}