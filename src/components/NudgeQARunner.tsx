import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runQAValidation, QA_SCENARIOS } from '@/scripts/nudgeQAValidation';
import { useAuth } from '@/contexts/auth';

interface QAResult {
  scenario: string;
  passed: boolean;
  expected: string[];
  actual: string[];
  message: string;
}

export function NudgeQARunner() {
  const { user } = useAuth();
  const [results, setResults] = useState<QAResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runQA = async () => {
    if (!user?.id) {
      alert('Please log in to run QA tests');
      return;
    }

    setIsRunning(true);
    try {
      console.log("🧪 Starting Nudge QA Validation...");
      const qaResults = await runQAValidation(user.id);
      setResults(qaResults);
      
      // Also log to console for easy copying
      console.log("📋 QA Results Summary:");
      qaResults.forEach(result => {
        console.log(`${result.passed ? '✅' : '❌'} ${result.scenario}`);
        console.log(`   Expected: [${result.expected.join(', ')}]`);
        console.log(`   Actual: [${result.actual.join(', ')}]`);
        console.log(`   Message: ${result.message}`);
      });
      
    } catch (error) {
      console.error('QA validation error:', error);
      alert(`QA Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Nudge System QA Validation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Validates the fixes: Daily Check-In until midnight, Breathing nudge with stress, Max 2 concurrent
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runQA} 
          disabled={isRunning || !user?.id}
          className="w-full"
        >
          {isRunning ? 'Running QA Tests...' : 'Run QA Validation'}
        </Button>
        
        {!user?.id && (
          <p className="text-sm text-yellow-600">Please log in to run QA tests</p>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <span className={`text-sm px-2 py-1 rounded ${
                passCount === totalCount ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {passCount}/{totalCount} Passed
              </span>
            </div>
            
            <div className="space-y-2">
              {results.map((result, index) => (
                <Card key={index} className={`border ${
                  result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        {result.passed ? '✅' : '❌'}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-medium">{result.scenario}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.message}
                        </p>
                        <div className="text-xs mt-2 space-y-1">
                          <div>Expected: <code>[{result.expected.join(', ')}]</code></div>
                          <div>Actual: <code>[{result.actual.join(', ')}]</code></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Test Scenarios Coverage:</h4>
              <ul className="text-sm space-y-1">
                {QA_SCENARIOS.map((scenario, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>{scenario.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}