import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { logSubtextEvent, generateRunId } from '@/lib/telemetry/heroSubtext';
import { 
  runAllQAScenarios, 
  runQAScenario,
  clearFreshnessMemory, 
  generateMarkdownReport,
  getHeroSubtext,
  QA_SCENARIOS,
  type QAReport 
} from '@/debug/heroSubtextQA';
import { Download, Play, Trash2, RefreshCw, Zap, BarChart3 } from 'lucide-react';

export default function HeroSubtextQA() {
  const [report, setReport] = useState<QAReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [ignoreSystemMessages, setIgnoreSystemMessages] = useState(true);
  const [recordEvents, setRecordEvents] = useState(false);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [eventLog, setEventLog] = useState<any[]>([]);
  
  const { enabled: telemetryEnabled } = useFeatureFlag('subtext_telemetry_enabled');

  // Auto-run on mount
  useEffect(() => {
    const runInitialTest = async () => {
      try {
        const result = runAllQAScenarios({ ignoreSystem: ignoreSystemMessages });
        setReport(result);
        await loadMetricsData();
        await loadEventLog();
      } catch (error) {
        console.error('[HeroSubtextQA] Initial test run failed:', error);
      } finally {
        setIsReady(true);
      }
    };
    
    runInitialTest();
  }, [ignoreSystemMessages]);

  // Load metrics data
  const loadMetricsData = async () => {
    try {
      const { data, error } = await supabase
        .from('v_subtext_daily_metrics')
        .select('*')
        .order('day', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error loading metrics:', error);
      } else {
        setMetricsData(data || []);
      }
    } catch (err) {
      console.error('Exception loading metrics:', err);
    }
  };

  // Load recent event log
  const loadEventLog = async () => {
    try {
      const { data, error } = await supabase
        .from('subtext_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);
      
      if (error) {
        console.error('Error loading event log:', error);
      } else {
        setEventLog(data || []);
      }
    } catch (err) {
      console.error('Exception loading event log:', err);
    }
  };

  const handleRunAll = async () => {
    setIsRunning(true);
    console.log('[HeroSubtextQA] Starting QA test run...');
    
    try {
      const result = runAllQAScenarios({ ignoreSystem: ignoreSystemMessages });
      
      // If recording events, emit telemetry for each scenario
      if (recordEvents && telemetryEnabled) {
        const syntheticUserId = '00000000-0000-4000-8000-000000000001';
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', '-');
        
        for (let i = 0; i < result.scenarios.length; i++) {
          const scenario = QA_SCENARIOS[i];
          const scenarioResult = result.scenarios[i];
          
          if (scenarioResult.picked.id !== 'default') {
            const runId = `qa-${timestamp}-${scenario.id}`;
            
            await logSubtextEvent({
              pickedId: scenarioResult.picked.id,
              category: scenarioResult.picked.category,
              event: 'shown',
              reason: scenarioResult.reason,
              runId,
              userId: syntheticUserId
            });
            
            console.log(`[QA] Logged telemetry for ${scenario.id}: ${scenarioResult.picked.id}`);
          }
        }
        
        // Refresh metrics after logging
        await loadMetricsData();
        await loadEventLog();
      }
      
      setReport(result);
      
      // Generate and save markdown report
      const markdown = generateMarkdownReport(result);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hero-subtext-qa-report.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[HeroSubtextQA] Test run completed:', result.summary);
    } catch (error) {
      console.error('[HeroSubtextQA] Test run failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearMemory = () => {
    clearFreshnessMemory();
    console.log('[HeroSubtextQA] Freshness memory cleared');
  };

  const handleRunSingle = (scenarioId: string) => {
    const scenario = QA_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    console.log(`[HeroSubtextQA] Running single scenario: ${scenarioId}`);
    const result = runQAScenario(scenario, { ignoreSystem: ignoreSystemMessages });
    console.log(`[HeroSubtextQA] Result:`, result);
  };

  // Simulate CTA click for QA scenarios
  const simulateCtaClick = async (pickedId: string, category: string) => {
    if (!recordEvents || !telemetryEnabled) return;
    
    const syntheticUserId = '00000000-0000-4000-8000-000000000001';
    const runId = generateRunId();
    
    await logSubtextEvent({
      pickedId,
      category,
      event: 'cta',
      runId,
      userId: syntheticUserId
    });
    
    console.log(`[QA] Simulated CTA click for ${pickedId}`);
    await loadEventLog();
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading Hero Subtext QA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hero Subtext QA Harness</h1>
          <p className="text-muted-foreground">
            Test the hero subtext content engine with deterministic scenarios
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Switch
              id="ignore-system"
              checked={ignoreSystemMessages}
              onCheckedChange={setIgnoreSystemMessages}
            />
            <Label htmlFor="ignore-system" className="text-sm">
              Ignore System Messages
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="record-events"
              checked={recordEvents}
              onCheckedChange={setRecordEvents}
              disabled={!telemetryEnabled}
            />
            <Label htmlFor="record-events" className="text-sm">
              Record Events
            </Label>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearMemory}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Memory
            </Button>
            
            <Button
              onClick={handleRunAll}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
          </div>
        </div>
      </div>

      {!telemetryEnabled && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Telemetry is disabled. Enable 'subtext_telemetry_enabled' feature flag to record events during QA.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
          <CardDescription>
            Deterministic scenarios with fixed timestamps and expected outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {QA_SCENARIOS.map((scenario) => (
              <Card key={scenario.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{scenario.id}</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRunSingle(scenario.id)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    {recordEvents && telemetryEnabled && report && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const result = report.scenarios.find(r => r.scenarioId === scenario.id);
                          if (result) {
                            simulateCtaClick(result.picked.id, result.picked.category);
                          }
                        }}
                        title="Simulate CTA Click"
                      >
                        <Zap className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {scenario.description}
                </p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">
                    {new Date(scenario.timestamp).toLocaleString()}
                  </Badge>
                  <Badge variant="secondary">
                    {scenario.expectedCategory}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Results
              {report.overallPass ? (
                <Badge className="bg-green-500">✅ PASS</Badge>
              ) : (
                <Badge className="bg-red-500">❌ FAIL</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Generated: {new Date(report.timestamp).toLocaleString()} | 
              {' '}{report.summary.passedTests}/{report.summary.totalTests} tests passed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{report.summary.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{report.summary.passedTests}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{report.summary.failedTests}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {(report.scenarios.reduce((sum, r) => sum + r.performanceMs, 0) / report.scenarios.length).toFixed(1)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Time</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left">Scenario</th>
                      <th className="border border-border p-2 text-left">Status</th>
                      <th className="border border-border p-2 text-left">Picked ID</th>
                      <th className="border border-border p-2 text-left">Category</th>
                      <th className="border border-border p-2 text-left">Text</th>
                      <th className="border border-border p-2 text-left">Performance</th>
                      <th className="border border-border p-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.scenarios.map((result) => (
                      <tr key={result.scenarioId} className={result.passed ? '' : 'bg-red-50 dark:bg-red-900/10'}>
                        <td className="border border-border p-2 font-medium">
                          {result.scenarioId}
                        </td>
                        <td className="border border-border p-2">
                          {result.passed ? (
                            <Badge className="bg-green-500">✅ PASS</Badge>
                          ) : (
                            <Badge className="bg-red-500">❌ FAIL</Badge>
                          )}
                        </td>
                        <td className="border border-border p-2">
                          <code className="text-sm">{result.picked.id}</code>
                        </td>
                        <td className="border border-border p-2">
                          <Badge variant="outline">{result.picked.category}</Badge>
                        </td>
                        <td className="border border-border p-2 max-w-xs">
                          <div className="truncate text-sm">
                            {result.picked.text}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.picked.text.length} chars, {result.gateChecks.emojiCount} emojis
                          </div>
                        </td>
                        <td className="border border-border p-2 text-sm">
                          {result.performanceMs.toFixed(2)}ms
                        </td>
                        <td className="border border-border p-2">
                          {result.issues.length > 0 ? (
                            <div className="text-sm text-red-600">
                              {result.issues.map((issue, i) => (
                                <div key={i}>• {issue}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-green-600 text-sm">✓ All checks passed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Panel */}
      {telemetryEnabled && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Daily Metrics (Last 10 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Day</th>
                        <th className="p-2">ID</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Shown</th>
                        <th className="p-2">CTA</th>
                        <th className="p-2">CTR%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricsData.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{new Date(row.day).toLocaleDateString()}</td>
                          <td className="p-2"><code className="text-xs">{row.picked_id}</code></td>
                          <td className="p-2">{row.category}</td>
                          <td className="p-2">{row.shown}</td>
                          <td className="p-2">{row.cta}</td>
                          <td className="p-2">{row.ctr_pct || 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No metrics data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Events (Last 25)</CardTitle>
            </CardHeader>
            <CardContent>
              {eventLog.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {eventLog.map((event, i) => (
                    <div key={i} className="text-xs border-l-2 border-muted pl-3 py-1">
                      <div className="flex gap-2 items-center">
                        <Badge variant={event.event === 'shown' ? 'secondary' : 'default'} className="text-xs">
                          {event.event}
                        </Badge>
                        <code>{event.picked_id}</code>
                        <span className="text-muted-foreground">{event.category}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No events logged yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Content Requirements</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Message length ≤ 72 characters</li>
                <li>• Emoji count: 0-2 emojis per message</li>
                <li>• Single line display (no line breaks)</li>
                <li>• Appropriate for light/dark themes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Behavior Requirements</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Feature flag hero_subtext_dynamic respected</li>
                <li>• Freshness guard prevents repeats (7 messages)</li>
                <li>• Time window boundaries respected</li>
                <li>• Performance target: &lt;10ms average</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}