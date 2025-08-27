import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle, Copy, RotateCcw, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { optimizedImagePrep, OptimizedPrepResult } from '@/lib/img/optimizedImagePrep';

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
  elapsed_ms?: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout' | 'skipped' | 'cancelled';
}

interface ProgressStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  ms?: number;
}

interface RunTelemetry {
  run_id: string;
  bytesBefore: number;
  bytesAfter: number;
  resize_ms: number;
  openai_ms?: number;
  google_ms?: number;
  first_hit: 'openai' | 'google' | 'none';
  decision: string;
  total_ms: number;
  decision_time_ms?: number;
  background_time_ms?: number;
  early_exit_provider?: string;
  imageVariant?: 'jpeg' | 'png';
  imageMime?: string;
}

interface TestResult {
  imageFile: string;
  results: AnalysisResult[];
  overallPass: boolean;
  telemetry?: RunTelemetry;
  imagePrep?: OptimizedPrepResult;
}

export default function AnalyzerOneClick() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applyHotThresholds, setApplyHotThresholds] = useState(true);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [providerResults, setProviderResults] = useState<AnalysisResult[]>([]);
  const [hasEarlyExit, setHasEarlyExit] = useState(false);
  const [decisionTime, setDecisionTime] = useState<number | null>(null);
  const [earlyExitProvider, setEarlyExitProvider] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[ANALYZER] page_mount');
  }, []);

  const runAnalyzerAudit = async (file: File) => {
    setIsRunning(true);
    setHasEarlyExit(false);
    setProviderResults([]);
    setDecisionTime(null);
    setEarlyExitProvider(null);
    
    const runId = crypto.randomUUID().substring(0, 8);
    const runStartTime = performance.now();
    
    console.log('[ANALYZER] run_start', { fileName: file.name, applyHotThresholds, runId });

    // Initialize progress steps
    const steps: ProgressStep[] = [
      { name: 'resizing', status: 'running' },
      { name: 'openai', status: 'pending' },
      { name: 'google', status: 'pending' }
    ];
    setProgressSteps([...steps]);

    try {
      // Phase 1: Optimized image prep
      const imagePrep = await optimizedImagePrep(file);
      const imageBase64 = imagePrep.dataUrl.split(',')[1]; // Remove data URL prefix
      
      steps[0] = { name: 'resizing', status: 'completed', ms: imagePrep.ms };
      setProgressSteps([...steps]);

      // Phase 2: Initialize provider tracking
      const results: AnalysisResult[] = [
        { provider: 'openai', status: 'pending', ok: false, decision: 'none', steps: [], response: null },
        { provider: 'google', status: 'pending', ok: false, decision: 'none', steps: [], response: null }
      ];
      setProviderResults([...results]);

      // Phase 3: Parallel provider execution with cancellation support
      const openaiController = new AbortController();
      const googleController = new AbortController();
      const TIMEOUT_MS = 12000; // Increased from 8000ms

      const runProvider = async (provider: string, index: number, controller: AbortController): Promise<void> => {
        const providerStartTime = performance.now();
        
        // Update status to running
        results[index] = { ...results[index], status: 'running' };
        setProviderResults([...results]);
        
        steps[index + 1] = { name: provider, status: 'running' };
        setProgressSteps([...steps]);

        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Provider timeout')), TIMEOUT_MS);
          });

          const analysisPromise = supabase.functions.invoke('enhanced-health-scanner', {
            body: {
              imageBase64,
              mode: 'scan',
              provider: provider,
              debug: true
            }
          });

          const { data, error } = await Promise.race([analysisPromise, timeoutPromise]) as any;
          const elapsed_ms = Math.round(performance.now() - providerStartTime);

          // Check if aborted
          if (controller.signal.aborted) {
            console.log(`[ANALYZER] ${provider}_cancelled_after_early_exit`);
            results[index] = {
              ...results[index],
              status: 'cancelled',
              ok: false,
              decision: 'cancelled',
              notes: 'CANCELLED',
              elapsed_ms
            };
            steps[index + 1] = { name: provider, status: 'error', ms: elapsed_ms };
            setProviderResults([...results]);
            setProgressSteps([...steps]);
            return;
          }

          if (error) {
            console.log(`[ANALYZER] ${provider}_done error:`, error.message);
            const isMissingKey = error.message?.includes('API key') || error.message?.includes('MISSING_KEY');
            
            results[index] = {
              ...results[index],
              status: isMissingKey ? 'skipped' : 'error',
              ok: false,
              decision: isMissingKey ? 'skipped' : 'error',
              notes: isMissingKey ? 'MISSING_KEY' : `Error: ${error.message}`,
              elapsed_ms
            };
          } else {
            // Extract analysis data with brand normalization
            const analysisSteps = data.steps || [];
            const ocrStep = analysisSteps.find((s: any) => s.stage === 'ocr');  
            const logoStep = analysisSteps.find((s: any) => s.stage === 'logo');
            const openaiStep = analysisSteps.find((s: any) => s.stage === 'openai');
            const timeoutStep = analysisSteps.find((s: any) => s.stage === 'timeout');
            const earlyExitStep = analysisSteps.find((s: any) => s.stage === 'early_exit');
            
            let notes = '';
            if (timeoutStep) {
              notes = 'TIMEOUT';
            } else if (analysisSteps.some((s: any) => s.meta?.code === 'MISSING_KEY')) {
              notes = 'MISSING_KEY';
            } else if (analysisSteps.some((s: any) => s.stage === 'openai_parse' && !s.ok)) {
              notes = 'PARSE_ERR';
            } else if (earlyExitStep?.ok) {
              notes = `EARLY_EXIT: ${earlyExitStep.meta?.reason || 'brand_hit'}`;
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

            const isSuccess = decision === 'single_product' || decision === 'branded_candidates';
            
            results[index] = {
              ...results[index],
              status: 'completed',
              ok: isSuccess,
              brand_guess: earlyExitStep?.meta?.brand || openaiStep?.meta?.brandGuess || logoStep?.meta?.brandGuess || ocrStep?.meta?.brandGuess || openaiStep?.meta?.brand || '',
              logo_brands: logoStep?.meta?.logoBrands || [],
              ocr_top_tokens: ocrStep?.meta?.topTokens?.slice(0, 5) || [],
              decision,
              notes,
              steps: analysisSteps,
              response: data,
              elapsed_ms
            };

            console.log(`[ANALYZER] ${provider}_done decision:`, decision);

            // Early exit check - if this provider found decisive results or early exit was triggered
            const hasEarlyExitNow = earlyExitStep?.ok || (isSuccess && !hasEarlyExit);
            if (hasEarlyExitNow && !hasEarlyExit) {
              const currentTime = performance.now();
              setDecisionTime(Math.round(currentTime - runStartTime));
              setEarlyExitProvider(provider);
              setHasEarlyExit(true);
              
              console.log('[ANALYZER] Early exit triggered', { provider, decision, reason: earlyExitStep?.meta?.reason });
              
              // Cancel the other provider
              if (provider === 'openai') {
                googleController.abort();
              } else {
                openaiController.abort();
              }
              
              // Navigate to HealthScan flow with candidates
              if (data.candidates && data.candidates.length > 0) {
                toast({
                  title: "🎯 Product Detected!",
                  description: `Found ${data.candidates.length} matches. Redirecting to product selection...`,
                });
                
                // Store the scan data for the health check modal
                sessionStorage.setItem('health-scan-data', JSON.stringify({
                  imageBase64: imagePrep.dataUrl,
                  candidates: data.candidates,
                  provider: provider
                }));
                
                // Navigate to camera page which will open the health check modal
                setTimeout(() => {
                  navigate('/camera?health-scan=true');
                }, 1000);
              }
            }
          }

          steps[index + 1] = { 
            name: provider, 
            status: results[index].status === 'error' || results[index].status === 'cancelled' ? 'error' : 'completed', 
            ms: elapsed_ms 
          };
          
        } catch (providerError: any) {
          const elapsed_ms = Math.round(performance.now() - providerStartTime);
          console.log(`[ANALYZER] ${provider}_done exception:`, providerError.message);
          
          let status: 'error' | 'timeout' | 'skipped' | 'cancelled' = 'error';
          let notes = `Exception: ${providerError.message}`;
          
          if (providerError.name === 'AbortError' || controller.signal.aborted) {
            status = 'cancelled';
            notes = 'CANCELLED';
            console.log(`[ANALYZER] openai_cancelled_after_early_exit`);
          } else if (providerError.message === 'Provider timeout') {
            status = 'timeout';
            notes = 'TIMEOUT';
          } else if (providerError.message?.includes('API key') || providerError.message?.includes('MISSING_KEY')) {
            status = 'skipped';
            notes = 'MISSING_KEY';
          }

          results[index] = {
            ...results[index],
            status,
            ok: false,
            decision: status,
            notes,
            elapsed_ms
          };

          steps[index + 1] = { name: provider, status: 'error', ms: elapsed_ms };
        }

        setProviderResults([...results]);
        setProgressSteps([...steps]);
      };

      // Run providers in parallel
      await Promise.allSettled([
        runProvider('openai', 0, openaiController),
        runProvider('google', 1, googleController)
      ]);

      const totalMs = Math.round(performance.now() - runStartTime);
      const overallPass = results.some(r => r.ok);
      
      // Calculate background completion time
      let backgroundTimeMs: number | null = null;
      if (decisionTime) {
        const completedProviders = results.filter(r => r.elapsed_ms && r.status === 'completed');
        if (completedProviders.length > 0) {
          backgroundTimeMs = Math.max(...completedProviders.map(r => r.elapsed_ms!));
        }
      }
      
      // Create telemetry
      const telemetry: RunTelemetry = {
        run_id: runId,
        bytesBefore: imagePrep.bytesBefore,
        bytesAfter: imagePrep.bytesAfter,
        resize_ms: imagePrep.ms,
        openai_ms: results.find(r => r.provider === 'openai')?.elapsed_ms,
        google_ms: results.find(r => r.provider === 'google')?.elapsed_ms,
        first_hit: results.find(r => r.ok && r.decision === 'branded_candidates')?.provider as any || 'none',
        decision: results.find(r => r.ok)?.decision || 'none',
        total_ms: totalMs,
        decision_time_ms: decisionTime,
        background_time_ms: backgroundTimeMs,
        early_exit_provider: earlyExitProvider
      };

      console.log('[ANALYZER] decision', telemetry);
      
      const testResult: TestResult = {
        imageFile: file.name,
        results,
        overallPass,
        telemetry,
        imagePrep
      };

      setTestResults(prev => [testResult, ...prev]);

      if (!hasEarlyExit) {
        toast({
          title: overallPass ? "Analysis PASSED" : "Analysis FAILED",
          description: `${results.filter(r => r.ok).length}/${results.length} providers succeeded`,
          variant: overallPass ? "default" : "destructive"
        });
      }

    } catch (error: any) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />;
      case 'error': case 'timeout': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'skipped': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDecisionBadgeVariant = (decision: string) => {
    switch (decision) {
      case 'single_product': return 'default';
      case 'branded_candidates': return 'secondary';
      case 'none': return 'outline';
      case 'error': return 'destructive';
      case 'cancelled': return 'secondary';
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
    setProgressSteps([]);
    setProviderResults([]);
    setHasEarlyExit(false);
    console.log('[ANALYZER] reset');
    setDecisionTime(null);
    setEarlyExitProvider(null);
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
              onClick={() => runSampleTest('trader-joes-granola.jpg')} 
              disabled={isRunning}
            >
              Run Trader Joe's Granola Test
            </Button>

            <Button 
              variant="secondary" 
              onClick={() => runSampleTest('cereal-front-a.jpg')} 
              disabled={isRunning}
            >
              Run with Sample A
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Progress */}
      {(progressSteps.length > 0 || providerResults.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Live Analysis Progress
              {hasEarlyExit && (
                <Badge variant="default" className="bg-green-500 text-white">
                  Early Exit Triggered!
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Progress Steps */}
            {progressSteps.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-2">
                  {progressSteps.map((step, index) => (
                    <div key={step.name} className="flex items-center gap-2">
                      {getStatusIcon(step.status)}
                      <span className="text-sm font-medium capitalize">{step.name}</span>
                      {step.ms && (
                        <Badge variant="outline" className="text-xs">
                          {step.ms}ms
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Provider Results */}
            {providerResults.length > 0 && (
              <div className="space-y-3">
                {providerResults.map((result, index) => (
                  <div key={result.provider} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{result.provider}</Badge>
                        {getStatusIcon(result.status)}
                        {result.decision !== 'none' && (
                          <Badge variant={getDecisionBadgeVariant(result.decision)}>
                            {result.decision}
                          </Badge>
                        )}
                         {result.status === 'cancelled' && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600">
                            Cancelled
                          </Badge>
                        )}
                        {result.steps?.some((s: any) => s.meta?.parseError) && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Parse Error
                          </Badge>
                        )}
                        {result.elapsed_ms && (
                          <Badge variant="outline" className="text-xs">
                            {result.elapsed_ms}ms
                          </Badge>
                        )}
                      </div>
                      {result.steps.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyStepsToClipboard(result.steps)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Copy className="h-3 w-3" />
                          Copy JSON
                        </Button>
                      )}
                    </div>
                    
                    {result.status === 'completed' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <strong>Brand (Normalized):</strong>
                          <div className="text-muted-foreground">
                            {result.brand_guess || 'None'}
                          </div>
                        </div>
                        <div>
                          <strong>Logo Candidates:</strong>
                          <div className="text-muted-foreground">
                            {result.logo_brands?.length > 0 ? result.logo_brands.slice(0, 3).join(', ') : 'None'}
                          </div>
                        </div>
                        <div>
                          <strong>OCR Top Tokens:</strong>
                          <div className="text-muted-foreground">
                            {result.ocr_top_tokens?.length > 0 ? result.ocr_top_tokens.slice(0, 8).join(', ') : 'None'}
                          </div>
                         </div>
                       </div>
                     )}
                     {result.steps?.some((s: any) => s.meta?.parseError) && (
                       <div className="mt-3 p-2 bg-yellow-50 rounded">
                         <div className="flex items-center justify-between">
                           <span className="text-yellow-800 text-sm font-medium">Raw OpenAI Response Available</span>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               const rawText = result.steps?.find((s: any) => s.meta?.rawText)?.meta?.rawText || 'No raw text';
                               navigator.clipboard.writeText(rawText);
                               toast({ title: "Copied raw OpenAI text to clipboard" });
                             }}
                           >
                             <Copy className="h-3 w-3 mr-1" />
                             Copy Raw
                           </Button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       )}

       {/* Test Results */}
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
          
          {/* Telemetry Display */}
          {testResult.telemetry && (
            <CardContent className="pt-0">
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Performance Telemetry
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Image Prep</div>
                     <div className="text-muted-foreground">
                       {testResult.imagePrep ? (
                         <>
                           {testResult.telemetry.resize_ms}ms
                           <br />
                           <span className="text-xs">
                             {(testResult.imagePrep.bytesBefore / 1024 / 1024).toFixed(1)}MB → {(testResult.imagePrep.bytesAfter / 1024 / 1024).toFixed(1)}MB
                             <br />
                             Variant: {testResult.imagePrep.variant?.toUpperCase()} ({testResult.imagePrep.mime})
                           </span>
                         </>
                       ) : (
                         `${testResult.telemetry.resize_ms}ms`
                       )}
                     </div>
                  </div>
                  {testResult.telemetry.decision_time_ms && (
                    <div>
                      <div className="font-medium">Decision Time</div>
                      <div className="text-muted-foreground">
                        {testResult.telemetry.decision_time_ms}ms
                        {testResult.telemetry.early_exit_provider && (
                          <Badge variant="default" className="ml-1 text-xs bg-green-500">
                            Early Exit ({testResult.telemetry.early_exit_provider})
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">OpenAI</div>
                    <div className="text-muted-foreground">
                      {testResult.telemetry.openai_ms ? `${testResult.telemetry.openai_ms}ms` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Google</div>
                    <div className="text-muted-foreground">
                      {testResult.telemetry.google_ms ? `${testResult.telemetry.google_ms}ms` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Background Time</div>
                    <div className="text-muted-foreground">
                      {testResult.telemetry.background_time_ms ? `${testResult.telemetry.background_time_ms}ms` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}