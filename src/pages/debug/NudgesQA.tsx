import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Target,
  AlertCircle,
  RefreshCw,
  List
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { selectNudgesForUser, NudgeCandidate, SchedulerOptions } from '@/nudges/scheduler';
import { logNudgeEvent } from '@/nudges/logEvent';
import { NUDGE_REGISTRY } from '@/nudges/registry';
import { runQAMatrix as runQAMatrixFn, QAScenarioResult } from '@/nudges/qa/qaRunner';
import { QA_SCENARIOS, QA_TEST_USERS } from '@/nudges/qa/scenarios';

interface QAReport {
  window: { from: string; to: string };
  totals: { eligible: number; shown: number; dismissed: number; cta: number };
  byNudge: Array<{
    nudge_id: string;
    shown: number;
    dismissed: number;
    cta: number;
    last_shown?: string;
    cooldown_breaches: number;
  }>;
  overFiring: Array<{
    nudge_id: string;
    user_id: string;
    count: number;
    details: string[];
  }>;
  caps: {
    dailyExceeded: Array<{
      nudge_id: string;
      user_id: string;
      day: string;
      shows: number;
    }>;
  };
  sample: Array<{
    ts: string;
    user_id: string;
    nudge_id: string;
    event: string;
    reason: string;
    run_id: string;
  }>;
  pass: boolean;
  notes: string[];
}

interface ScenarioResult {
  scenarioName: string;
  candidates: NudgeCandidate[];
  expectedCount: number;
  expectedNudges: string[];
  passed?: boolean;
  issues?: string[];
}

export function NudgesQA() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<QAReport | null>(null);
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [dryRun, setDryRun] = useState(!isAdmin);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runQAMatrix = async () => {
    if (!user?.id) {
      addLog('❌ User not authenticated');
      return;
    }
    
    setRunning(true);
    setLogs([]);
    setScenarioResults([]);
    addLog(`Starting QA Matrix execution${dryRun ? ' (DRY RUN - no DB writes)' : ''}...`);

    try {
      // Use the new QA runner for deterministic testing
      const matrixResult = await runQAMatrixFn(user.id, dryRun);
      
      // Convert results to display format
      const newScenarioResults: ScenarioResult[] = matrixResult.results.map(result => ({
        scenarioName: result.scenarioId,
        candidates: result.candidates,
        expectedCount: result.scenario.expect.length,
        expectedNudges: result.scenario.expect,
        passed: result.passed,
        issues: result.issues,
      }));
      
      setScenarioResults(newScenarioResults);
      
      // Log results
      for (const result of matrixResult.results) {
        const allowedNudges = result.candidates.filter(c => c.allowed);
        addLog(`${result.scenarioId}: ${result.passed ? '✅' : '❌'} (got ${allowedNudges.length}, expected ${result.scenario.expect.length})`);
        
        if (result.issues.length > 0) {
          result.issues.forEach(issue => addLog(`  ⚠️ ${issue}`));
        }
      }
      
      addLog(`QA Matrix completed: ${matrixResult.summary.passedScenarios}/${matrixResult.summary.totalScenarios} scenarios passed`);
    } catch (error) {
      addLog(`❌ QA Matrix failed: ${error}`);
    } finally {
      setRunning(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    addLog('Generating QA report...');

    try {
      const { data, error } = await supabase.functions.invoke('nudges-qa-report', {
        body: { sinceHours: 24 }
      });

      if (error) throw error;

      setReport(data);
      addLog(`Report generated: ${data.pass ? 'PASS ✅' : 'FAIL ❌'}`);
    } catch (error) {
      addLog(`❌ Report generation failed: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;

    const csvData = [
      ['Timestamp', 'User ID', 'Nudge ID', 'Event', 'Reason', 'Run ID'],
      ...report.sample.map(row => [
        row.ts,
        row.user_id,
        row.nudge_id,
        row.event,
        row.reason,
        row.run_id
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nudge-qa-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getGateIcon = (pass: boolean) => {
    return pass ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />;
  };

  // Show UI regardless of admin status, but with appropriate warnings
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatCTR = (shown: number, cta: number) => {
    if (shown === 0) return '0%';
    return `${((cta / shown) * 100).toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nudge QA System</h1>
          <p className="text-muted-foreground">Automated testing and reporting for nudge scheduler</p>
        </div>
        <Badge variant="outline" className="text-orange-600">
          {dryRun ? 'Dry Run Mode' : 'Live Mode'}
        </Badge>
      </div>

      {/* Registry Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Nudge Registry IDs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {NUDGE_REGISTRY.map(nudge => (
              <Badge key={nudge.id} variant="outline">
                {nudge.id}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Non-admin warning */}
      {!isAdmin && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Read-only mode:</strong> You can run QA scenarios but no data will be written to the database.
          </AlertDescription>
        </Alert>
      )}

      {/* QA Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Run QA Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Execute {QA_SCENARIOS.length} deterministic scenarios with synthetic history
              {dryRun && ' (read-only simulation)'}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="dryRun"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="dryRun" className="text-sm">Dry run (no DB writes)</label>
              </div>
            )}
            <Button 
              onClick={runQAMatrix} 
              disabled={running}
              className="w-full"
            >
              {running && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {running ? 'Running...' : 'Run QA Matrix'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analyze QA results from the last 24 hours
            </p>
            <Button 
              onClick={generateReport} 
              disabled={generating}
              variant="outline"
              className="w-full"
            >
              {generating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Results */}
      {scenarioResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Scenario Results</h2>
          {scenarioResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{result.scenarioName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.passed === false ? 'destructive' : 'default'}>
                      Expected: {result.expectedCount}, Got: {result.candidates.filter(c => c.allowed).length}
                    </Badge>
                    {result.passed !== undefined && (
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? '✅ PASS' : '❌ FAIL'}
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.issues && result.issues.length > 0 && (
                  <div className="mb-4 space-y-1">
                    <h4 className="font-medium text-red-600">Issues:</h4>
                    {result.issues.map((issue, issueIndex) => (
                      <div key={issueIndex} className="text-sm text-red-600">• {issue}</div>
                    ))}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Nudge ID</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Gate Results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.candidates.map((candidate, candIndex) => (
                        <tr key={candIndex} className={`border-b ${candidate.allowed ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <td className="p-2 font-medium">{candidate.id}</td>
                          <td className="p-2">
                            <Badge variant={candidate.allowed ? 'default' : 'secondary'}>
                              {candidate.allowed ? '✅ ALLOWED' : '❌ BLOCKED'}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="space-y-1">
                              {candidate.reasons.map((reason, reasonIndex) => (
                                <div key={reasonIndex} className="flex items-center gap-2 text-xs">
                                  {getGateIcon(reason.pass)}
                                  <span className="font-medium">{reason.gate}:</span>
                                  {reason.detail && (
                                    <span className="text-muted-foreground">{reason.detail}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Pass/Fail Header */}
          <Alert className={report.pass ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {report.pass ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="font-semibold">
                {report.pass ? 'PASS ✅' : 'FAIL ❌'}
              </div>
              {report.notes.length > 0 && (
                <div className="mt-2 space-y-1">
                  {report.notes.map((note, index) => (
                    <div key={index} className="text-sm">{note}</div>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* KPI Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Shown</span>
                </div>
                <p className="text-2xl font-bold mt-1">{report.totals.shown}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Dismissed</span>
                </div>
                <p className="text-2xl font-bold mt-1">{report.totals.dismissed}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">CTA</span>
                </div>
                <p className="text-2xl font-bold mt-1">{report.totals.cta}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">CTR</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {formatCTR(report.totals.shown, report.totals.cta)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* By Nudge Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>By Nudge</CardTitle>
                <Button 
                  onClick={downloadCSV}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nudge ID</th>
                      <th className="text-left p-2">Shown</th>
                      <th className="text-left p-2">CTR</th>
                      <th className="text-left p-2">Last Shown</th>
                      <th className="text-left p-2">Cooldown Breaches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byNudge.map((nudge, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{nudge.nudge_id}</td>
                        <td className="p-2">{nudge.shown}</td>
                        <td className="p-2">{formatCTR(nudge.shown, nudge.cta)}</td>
                        <td className="p-2">
                          {nudge.last_shown ? new Date(nudge.last_shown).toLocaleString() : 'Never'}
                        </td>
                        <td className="p-2">
                          {nudge.cooldown_breaches > 0 ? (
                            <Badge variant="destructive">{nudge.cooldown_breaches}</Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {(report.overFiring.length > 0 || report.caps.dailyExceeded.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Issues Found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.overFiring.map((issue, index) => (
                  <Alert key={index} className="border-red-200">
                    <AlertDescription>
                      <strong>Over-firing:</strong> {issue.nudge_id} shown {issue.count} times to {issue.user_id}
                      <div className="mt-1 text-xs">
                        {issue.details.join(', ')}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
                
                {report.caps.dailyExceeded.map((cap, index) => (
                  <Alert key={index} className="border-red-200">
                    <AlertDescription>
                      <strong>Daily cap exceeded:</strong> {cap.nudge_id} shown {cap.shows} times on {cap.day} for {cap.user_id}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Execution Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Execution Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-700 dark:text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}