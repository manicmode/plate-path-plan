import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { scheduleNudges, NudgeCandidate } from '@/nudges/scheduler';
import { selectNudgesForUser, SelectedNudge } from '@/nudges/scheduler';
import { logNudgeEvent } from '@/nudges/logEvent';
import NudgeQARunner from '@/scripts/nudgeQARunner';

interface WindowBoundary {
  hour: number;
  timeUntil: number;
  description: string;
}

export function NudgeQADashboard() {
  const { user } = useAuth();
  const [ptTime, setPtTime] = useState<string>('');
  const [localStorageData, setLocalStorageData] = useState<any>({});
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [isInWindow, setIsInWindow] = useState(false);
  const [eligibleNudges, setEligibleNudges] = useState<NudgeCandidate[]>([]);
  const [nextBoundary, setNextBoundary] = useState<WindowBoundary | null>(null);
  const [isRunningQA, setIsRunningQA] = useState(false);
  const [qaResults, setQAResults] = useState<any[]>([]);
  const [stressSimulated, setStressSimulated] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pt = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
      setPtTime(pt.toLocaleTimeString());
      
      const hour = pt.getHours();
      setIsInWindow(hour >= 19 && hour < 24);
      
      // Calculate next boundary
      const boundaries = [0, 9, 10, 19, 20, 21, 23, 24];
      let nextHour = boundaries.find(h => h > hour);
      if (!nextHour) {
        nextHour = 24;
      }
      
      const nextBoundaryTime = new Date(pt);
      if (nextHour === 24) {
        nextBoundaryTime.setDate(nextBoundaryTime.getDate() + 1);
        nextBoundaryTime.setHours(0, 0, 0, 0);
      } else {
        nextBoundaryTime.setHours(nextHour, 0, 0, 0);
      }
      
      const msUntil = nextBoundaryTime.getTime() - pt.getTime();
      
      setNextBoundary({
        hour: nextHour,
        timeUntil: msUntil,
        description: nextHour === 24 ? 'Midnight refresh' : `${nextHour}:00 boundary refresh`
      });
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
          shownRunIds: shownRunIds ? JSON.parse(shownRunIds) : [],
          isRehydrated: !!activeNudges && JSON.parse(activeNudges).length > 0
        });
      };
      
      checkLocalStorage();
      const interval = setInterval(checkLocalStorage, 2000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Check eligible nudges every 30 seconds
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?.id) return;
      
      try {
        const result = await scheduleNudges({
          userId: user.id,
          now: new Date(),
          maxPerRun: 10, // Get all candidates
          qaMode: true,
          qaMock: stressSimulated ? { stressTagsLast48h: true } : undefined
        });
        
        setEligibleNudges(result.reasons || []);
      } catch (error) {
        console.error('Error checking nudge eligibility:', error);
      }
    };
    
    checkEligibility();
    const interval = setInterval(checkEligibility, 30000);
    return () => clearInterval(interval);
  }, [user?.id, stressSimulated]);

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
    setStressSimulated(!stressSimulated);
    
    if (!stressSimulated) {
      console.log("🧠 Simulating stress context for breathing nudge eligibility");
      
      // Create a test mood log with stress tags
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('mood_logs')
            .insert({
              user_id: user.id,
              mood_score: 3,
              tags: ['stressed', 'anxious'],
              reflection: 'QA Test - simulated stress for breathing nudge testing',
              created_at: new Date().toISOString()
            });
            
          if (!error) {
            console.log("✅ Created test mood log with stress tags");
          }
        } catch (error) {
          console.error('Error creating test mood log:', error);
        }
      }
    } else {
      console.log("❌ Disabled stress simulation");
    }
  };

  const runComprehensiveQA = async () => {
    setIsRunningQA(true);
    try {
      const qaRunner = new NudgeQARunner();
      await qaRunner.runComprehensiveQA();
      setQAResults([{ message: "QA completed - check console for detailed results", timestamp: new Date() }]);
    } catch (error) {
      console.error('QA Runner failed:', error);
      setQAResults([{ message: `QA failed: ${error}`, timestamp: new Date() }]);
    } finally {
      setIsRunningQA(false);
    }
  };

  const logCurrentState = () => {
    const evidence = {
      ptTime,
      isInWindow,
      localStorageData,
      recentEvents: dbEvents.slice(0, 5),
      eligibleNudges: eligibleNudges.map(n => ({
        id: n.id,
        allowed: n.allowed,
        reasons: n.reasons
      })),
      nextBoundary,
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
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <h4 className="font-medium">Next Boundary</h4>
              {nextBoundary && (
                <>
                  <p className="text-sm font-medium">{nextBoundary.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(nextBoundary.timeUntil / 60000)}m {Math.floor((nextBoundary.timeUntil % 60000) / 1000)}s
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Nudge Eligibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eligibleNudges.map((nudge, i) => (
              <div key={i} className={`p-3 rounded border ${nudge.allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{nudge.id}</h4>
                  <Badge variant={nudge.allowed ? "default" : "secondary"}>
                    {nudge.allowed ? "Eligible" : "Blocked"}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1">
                  {nudge.reasons.map((reason, ri) => (
                    <div key={ri} className="text-xs flex items-center gap-2">
                      <span>{reason.pass ? '✅' : '❌'}</span>
                      <span className="font-mono">{reason.gate}</span>
                      <span className="text-muted-foreground">{reason.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>localStorage Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Persistence Status</h4>
              <Badge variant={localStorageData.isRehydrated ? "default" : "secondary"}>
                {localStorageData.isRehydrated ? "Rehydrated" : "Fresh Run"}
              </Badge>
            </div>
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
          <Button onClick={runComprehensiveQA} disabled={isRunningQA} className="w-full">
            {isRunningQA ? 'Running Comprehensive QA...' : '🧪 Run Comprehensive QA'}
          </Button>
          <Button onClick={logCurrentState} className="w-full">
            📊 Log Current State to Console
          </Button>
          <Button 
            onClick={simulateStressContext} 
            variant={stressSimulated ? "destructive" : "outline"} 
            className="w-full"
          >
            {stressSimulated ? '❌ Disable Stress Simulation' : '🧠 Simulate Stress Context'}
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

      {qaResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>QA Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {qaResults.map((result, i) => (
                <div key={i} className="text-sm p-2 bg-gray-100 rounded">
                  <span className="font-medium">{result.message}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {result.timestamp?.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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