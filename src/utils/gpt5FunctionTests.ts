/**
 * GPT-5 Function Verification Script
 * Tests all three functions with minimal payloads
 */

interface TestResult {
  endpoint: string;
  model: string;
  latency_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  fallback: boolean;
  status: number;
  response_preview: string;
}

const testResults: TestResult[] = [];

const testFunction = async (endpoint: string, payload: any, useSupabase = false): Promise<TestResult> => {
  const startTime = Date.now();
  let status = 0;
  let response_preview = '';
  let model = 'unknown';
  let tokens_in: number | undefined;
  let tokens_out: number | undefined;
  let fallback = false;

  try {
    let response: Response;
    
    if (useSupabase) {
      // For Supabase function calls
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke(endpoint, { body: payload });
      
      if (error) throw error;
      
      status = 200;
      model = data?.model_used || 'gpt-5';
      tokens_in = data?.processing_stats?.tokens?.input;
      tokens_out = data?.processing_stats?.tokens?.output;
      fallback = data?.fallback_used || false;
      response_preview = JSON.stringify(data).substring(0, 120);
      
    } else {
      // For direct HTTP calls
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      response = await fetch(`https://uzoiiijqtahohfafqirm.functions.supabase.co/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(payload)
      });
      
      status = response.status;
      const data = await response.json();
      model = data?.model_used || 'gpt-5';
      tokens_in = data?.processing_stats?.tokens?.input;
      tokens_out = data?.processing_stats?.tokens?.output;
      fallback = data?.fallback_used || false;
      response_preview = JSON.stringify(data).substring(0, 120);
    }
    
  } catch (error: any) {
    status = 500;
    response_preview = error.message?.substring(0, 120) || 'Unknown error';
  }

  return {
    endpoint,
    model,
    latency_ms: Date.now() - startTime,
    tokens_in,
    tokens_out,
    fallback,
    status,
    response_preview
  };
};

// Test payloads
const testVoiceLogging = () => testFunction('log-voice-gpt5', 
  { text: 'apple' }, false
);

const testPhotoDetection = () => testFunction('gpt5-vision-food-detector', 
  { 
    imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    prompt: 'Test image'
  }, true
);

const testSmartAnalyzer = () => testFunction('gpt5-smart-food-analyzer',
  { text: 'banana', complexity: 'simple' }, true
);

// Test aliases  
const testVoiceAlias = () => testFunction('log-voice',
  { text: 'test' }, false
);

const testVisionAlias = () => testFunction('gpt4-vision-food-detector',
  { imageBase64: 'test', prompt: 'test' }, true
);

const testAnalyzerAlias = () => testFunction('gpt-smart-food-analyzer',
  { text: 'test' }, true
);

// Run all tests
const runAllTests = async (): Promise<TestResult[]> => {
  console.log('🧪 Testing GPT-5 functions...');
  
  const tests = [
    testVoiceLogging(),
    testPhotoDetection(), 
    testSmartAnalyzer(),
    testVoiceAlias(),
    testVisionAlias(),
    testAnalyzerAlias()
  ];
  
  const results = await Promise.allSettled(tests);
  const testResults = results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        endpoint: ['log-voice-gpt5', 'gpt5-vision-food-detector', 'gpt5-smart-food-analyzer', 'log-voice', 'gpt4-vision-food-detector', 'gpt-smart-food-analyzer'][idx],
        model: 'error',
        latency_ms: 0,
        fallback: false,
        status: 500,
        response_preview: result.reason?.message?.substring(0, 120) || 'Test failed'
      };
    }
  });
  
  return testResults;
};

// Expose globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testGPT5Functions = runAllTests;
  console.log('🧪 GPT-5 Function Tests loaded. Run: window.testGPT5Functions()');
}

export { runAllTests, testVoiceLogging, testPhotoDetection, testSmartAnalyzer };