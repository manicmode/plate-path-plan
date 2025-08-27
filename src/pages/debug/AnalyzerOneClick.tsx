import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle, Copy, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  provider: string;
  ok: boolean;
  brand_guess?: string;
  logo_brands?: string[];
  ocr_top_tokens?: string[];
  decision: string;
  notes?: string;
  steps: any[];
  response: any;
}

interface TestResult {
  imageFile: string;
  results: AnalysisResult[];
  overallPass: boolean;
}

export default function AnalyzerOneClick() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applyHotThresholds, setApplyHotThresholds] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('[ANALYZER] page_mount');
  }, []);

  const runAnalyzerAudit = async (file: File) => {
    setIsRunning(true);
    console.log('[ANALYZER] run_start', { fileName: file.name, applyHotThresholds });
    const results: AnalysisResult[] = [];

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      const imageBase64 = base64.split(',')[1]; // Remove data URL prefix

      const providers = ['openai', 'google', 'hybrid'];
      
      for (const provider of providers) {
        try {
          console.log(`[ANALYZER] Testing provider: ${provider}`);
          
          const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
            body: {
              imageBase64,
              mode: 'scan',
              provider,
              debug: true
            }
          });

          if (error) {
            console.log(`[ANALYZER] ${provider}_done error:`, error.message);
            // Check if it's a missing key error
            const isMissingKey = error.message?.includes('API key') || error.message?.includes('MISSING_KEY');
            results.push({
              provider,
              ok: false,
              decision: isMissingKey ? 'skipped' : 'error',
              notes: isMissingKey ? 'MISSING_KEY' : `Error: ${error.message}`,
              steps: [],
              response: null
            });
            continue;
          }

          // Extract analysis data
          const steps = data.steps || [];
          const ocrStep = steps.find((s: any) => s.stage === 'ocr');
          const logoStep = steps.find((s: any) => s.stage === 'logo');
          const openaiStep = steps.find((s: any) => s.stage === 'openai');
          const timeoutStep = steps.find((s: any) => s.stage === 'timeout');
          
          let notes = '';
          if (timeoutStep) {
            notes = 'TIMEOUT';
          } else if (steps.some((s: any) => s.meta?.code === 'MISSING_KEY')) {
            notes = 'MISSING_KEY';
          } else if (steps.some((s: any) => s.stage === 'openai_parse' && !s.ok)) {
            notes = 'PARSE_ERR';
          }

          // Apply hot thresholds if enabled
          let decision = data.kind || 'none';
          if (applyHotThresholds) {
            const openaiConfidence = openaiStep?.meta?.confidence || 0;
            const ocrBrandCount = ocrStep?.meta?.topTokens?.filter((t: string) => 
              /trader|kellogg|nestle|pepsi|coca|quaker|nature|kind|clif|oreo|cheerios/i.test(t)
            ).length || 0;
            
            if (openaiConfidence >= 0.35 || ocrBrandCount > 0) {
              if (decision === 'none') {
                decision = 'branded_candidates';
              }
            }
          }

          console.log(`[ANALYZER] ${provider}_done decision:`, decision);

          results.push({
            provider,
            ok: decision === 'single_product' || decision === 'branded_candidates',
            brand_guess: openaiStep?.meta?.brand || '',
            logo_brands: logoStep?.meta?.logoBrands || [],
            ocr_top_tokens: ocrStep?.meta?.topTokens?.slice(0, 5) || [],
            decision,
            notes,
            steps,
            response: data
          });

        } catch (providerError) {
          console.log(`[ANALYZER] ${provider}_done exception:`, providerError.message);
          const isMissingKey = providerError.message?.includes('API key') || providerError.message?.includes('MISSING_KEY');
          results.push({
            provider,
            ok: false,
            decision: isMissingKey ? 'skipped' : 'error',
            notes: isMissingKey ? 'MISSING_KEY' : `Exception: ${providerError.message}`,
            steps: [],
            response: null
          });
        }
      }

      const overallPass = results.some(r => r.ok);
      
      const testResult: TestResult = {
        imageFile: file.name,
        results,
        overallPass
      };

      setTestResults(prev => [testResult, ...prev]);

      toast({
        title: overallPass ? "Analysis PASSED" : "Analysis FAILED",
        description: `${results.filter(r => r.ok).length}/${results.length} providers succeeded`,
        variant: overallPass ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Analyzer audit failed:', error);
      toast({
        title: "Audit Failed",
        description: error.message || "Failed to run analyzer audit",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runSampleTest = async (sampleName: string) => {
    console.log('[ANALYZER] sample_loaded', { sampleName });
    try {
      const response = await fetch(`/test-assets/${sampleName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sample: ${response.status}`);
      }
      const blob = await response.blob();
      const file = new File([blob], sampleName, { type: 'image/jpeg' });
      await runAnalyzerAudit(file);
    } catch (error) {
      console.error('[ANALYZER] sample_failed', { sampleName, error: error.message });
      toast({
        title: "Sample Test Failed",
        description: `Could not load sample ${sampleName}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getDecisionBadgeVariant = (decision: string) => {
    switch (decision) {
      case 'single_product': return 'default';
      case 'branded_candidates': return 'secondary';
      case 'none': return 'outline';
      case 'error': return 'destructive';
      case 'skipped': return 'secondary';
      default: return 'outline';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-run after file selection
      await runAnalyzerAudit(file);
    }
  };

  const resetResults = () => {
    setTestResults([]);
    setSelectedFile(null);
    console.log('[ANALYZER] reset');
  };

  const copyStepsToClipboard = (steps: any[]) => {
    const stepsJson = JSON.stringify(steps, null, 2);
    navigator.clipboard.writeText(stepsJson).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Steps data copied as JSON",
      });
    });
  };

  const formatStepData = (step: any) => {
    const { stage, ok, meta } = step;
    return `${stage}: ${ok ? '✓' : '✗'} ${JSON.stringify(meta || {}, null, 2)}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analyzer One-Click Probe</h1>
          <p className="text-muted-foreground">Test image analysis across providers</p>
        </div>
        {testResults.length > 0 && (
          <Button variant="outline" onClick={resetResults} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>Upload an image or run with sample data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hotThresholds"
              checked={applyHotThresholds}
              onCheckedChange={(checked) => setApplyHotThresholds(checked === true)}
            />
            <label htmlFor="hotThresholds" className="text-sm font-medium cursor-pointer">
              Apply Hot Thresholds (OpenAI ≥0.35, OCR fuzzy ≥0.45)
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={isRunning}
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('file-upload')?.click()} 
                disabled={isRunning}
              >
                {isRunning ? 'Running...' : 'Choose Image'}
              </Button>
            </div>

            <Button 
              variant="secondary" 
              onClick={() => runSampleTest('cereal-front-a.jpg')} 
              disabled={isRunning}
            >
              Run with Sample A
            </Button>

            <Button 
              variant="secondary" 
              onClick={() => runSampleTest('beverage-front-a.jpg')} 
              disabled={isRunning}
            >
              Run with Sample B
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResults.map((testResult, testIndex) => (
        <Card key={testIndex}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {testResult.overallPass ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={testResult.overallPass ? "text-green-600" : "text-red-600"}>
                  {testResult.overallPass ? "PASS" : "FAIL"}
                </span>
              </CardTitle>
              <Badge variant="outline">{testResult.imageFile}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResult.results.map((result, resultIndex) => (
                <div key={resultIndex} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{result.provider}</Badge>
                      {result.ok ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={getDecisionBadgeVariant(result.decision)}>
                        {result.decision}
                      </Badge>
                      {result.notes && (
                        <Badge variant={result.decision === 'skipped' ? 'secondary' : 'destructive'}>
                          {result.notes}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyStepsToClipboard(result.steps)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Brand Guess:</strong>
                      <div className="text-muted-foreground">
                        {result.brand_guess || 'None'}
                      </div>
                    </div>
                    <div>
                      <strong>Logo Brands:</strong>
                      <div className="text-muted-foreground">
                        {result.logo_brands?.length > 0 ? result.logo_brands.join(', ') : 'None'}
                      </div>
                    </div>
                    <div>
                      <strong>OCR Top Tokens:</strong>
                      <div className="text-muted-foreground">
                        {result.ocr_top_tokens?.length > 0 ? result.ocr_top_tokens.join(', ') : 'None'}
                      </div>
                    </div>
                  </div>

                  <Collapsible className="mt-4">
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm hover:text-primary">
                      <ChevronRight className="h-4 w-4" />
                      View Steps ({result.steps.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                        {result.steps.map((step, i) => formatStepData(step)).join('\n\n')}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}