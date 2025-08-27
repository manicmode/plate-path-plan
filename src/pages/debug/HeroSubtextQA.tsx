import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  runAllQAScenarios, 
  runQAScenario,
  clearFreshnessMemory, 
  generateMarkdownReport,
  getHeroSubtext,
  QA_SCENARIOS,
  type QAReport 
} from '@/debug/heroSubtextQA';
import { Download, Play, Trash2, RefreshCw } from 'lucide-react';

export default function HeroSubtextQA() {
  const [report, setReport] = useState<QAReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [ignoreSystemMessages, setIgnoreSystemMessages] = useState(true);

  // Auto-run on mount
  useEffect(() => {
    const runInitialTest = async () => {
      try {
        const result = runAllQAScenarios({ ignoreSystem: ignoreSystemMessages });
        setReport(result);
      } catch (error) {
        console.error('[HeroSubtextQA] Initial test run failed:', error);
      } finally {
        setIsReady(true);
      }
    };
    
    runInitialTest();
  }, [ignoreSystemMessages]);

  const handleRunAll = async () => {
    setIsRunning(true);
    console.log('[HeroSubtextQA] Starting QA test run...');
    
    try {
      const result = runAllQAScenarios({ ignoreSystem: ignoreSystemMessages });
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRunSingle(scenario.id)}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
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