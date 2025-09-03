import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runAllSmokeTests, type SmokeTestResult } from '@/lib/debug/smokeTests';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const PhotoPipelineDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<SmokeTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // You can provide a sample base64 image for happy path testing
      const results = await runAllSmokeTests();
      setTestResults(results);
    } catch (error) {
      console.error('Failed to run smoke tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    return `${duration}ms`;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Photo Pipeline Debugger
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Run comprehensive smoke tests to verify photo pipeline functionality
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Smoke Tests'}
          </Button>
          
          {testResults.length > 0 && (
            <Badge variant={testResults.every(r => r.passed) ? 'default' : 'destructive'}>
              {testResults.filter(r => r.passed).length}/{testResults.length} Passed
            </Badge>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {testResults.map((result, index) => (
              <Card key={index} className={result.passed ? 'border-green-200' : 'border-red-200'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.passed)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{formatDuration(result.duration)}</span>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="text-red-600 text-sm mb-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  
                  {result.details && (
                    <div className="text-xs text-muted-foreground">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Debug Environment Variables</h4>
          <div className="text-sm space-y-1">
            <div>DEBUG_EDGE: Server-side only</div>
            <div>VITE_DEBUG_CLIENT: {import.meta.env.VITE_DEBUG_CLIENT || 'false'}</div>
            <div>DEV Mode: {import.meta.env.DEV ? 'true' : 'false'}</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-2">Pass/Fail Criteria</h4>
          <ul className="text-sm space-y-1">
            <li>✅ Spinner never exceeds 12s watchdog on any path</li>
            <li>✅ Every Edge reply yields valid JSON with items: [] present</li>
            <li>✅ Names resolve from name|productName|title, else "Unknown"</li>
            <li>✅ Flagged items show flags; score looks reasonable</li>
            <li>✅ Barcode calories match when portion override applied</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoPipelineDebugger;