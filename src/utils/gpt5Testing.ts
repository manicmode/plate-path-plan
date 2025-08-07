/**
 * GPT-5 E2E Testing Utilities
 * Console testing functions for migration verification
 */

// Make functions globally available for testing
declare global {
  interface Window {
    GPT5_TEST: {
      testVoiceLogging: (text: string) => Promise<void>;
      testPhotoDetection: (imageBase64: string) => Promise<void>;
      testSmartLogPredictions: () => void;
      getPerformanceMetrics: () => any[];
    };
  }
}

let performanceMetrics: any[] = [];

const testVoiceLogging = async (text: string) => {
  console.log('🧪 [E2E Test] Starting Voice Logging test:', text);
  const startTime = Date.now();
  
  try {
    const { sendToLogVoice } = await import('@/integrations/logVoice');
    const result = await sendToLogVoice(text);
    
    const metrics = {
      test: 'voice_logging',
      endpoint: 'log-voice-gpt5',
      model: 'gpt-5-mini',
      latency_ms: Date.now() - startTime,
      status: 'success',
      timestamp: new Date().toISOString()
    };
    
    performanceMetrics.push(metrics);
    console.log('🚀 [GPT-5 Voice Test] Completed:', metrics);
    console.log('🚀 [GPT-5 Voice Test] Result:', result);
    
  } catch (error) {
    console.error('❌ [E2E Test] Voice logging failed:', error);
    performanceMetrics.push({
      test: 'voice_logging',
      endpoint: 'log-voice-gpt5',
      status: 'error',
      error: error.message,
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
};

const testPhotoDetection = async (imageBase64: string) => {
  console.log('🧪 [E2E Test] Starting Photo Detection test');
  const startTime = Date.now();
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('gpt5-vision-food-detector', {
      body: { 
        imageBase64: imageBase64,
        prompt: "Test food detection"
      }
    });
    
    const metrics = {
      test: 'photo_detection',
      endpoint: 'gpt5-vision-food-detector',
      model: data?.model_used || 'gpt-5',
      latency_ms: Date.now() - startTime,
      tokens: data?.processing_stats?.tokens,
      fallback_used: data?.fallback_used || false,
      status: error ? 'error' : 'success',
      timestamp: new Date().toISOString()
    };
    
    performanceMetrics.push(metrics);
    console.log('🚀 [GPT-5 Vision Test] Completed:', metrics);
    console.log('🚀 [GPT-5 Vision Test] Result:', data);
    
    if (error) {
      console.error('❌ [E2E Test] Photo detection error:', error);
    }
    
  } catch (error) {
    console.error('❌ [E2E Test] Photo detection failed:', error);
    performanceMetrics.push({
      test: 'photo_detection',
      endpoint: 'gpt5-vision-food-detector',
      status: 'error',
      error: error.message,
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
};

const testSmartLogPredictions = () => {
  console.log('🧪 [E2E Test] Testing SmartLog predictions rendering');
  const smartLogElement = document.querySelector('[data-testid="smartlog-predictions"]') || 
                          document.querySelector('.smartlog-ai-predictions') ||
                          document.querySelector('h3:contains("SmartLog AI Predictions")');
  
  const metrics = {
    test: 'smartlog_predictions',
    endpoint: 'ui_component',
    status: smartLogElement ? 'success' : 'not_found',
    element_found: !!smartLogElement,
    timestamp: new Date().toISOString()
  };
  
  performanceMetrics.push(metrics);
  console.log('🚀 [SmartLog Test] Completed:', metrics);
  
  if (smartLogElement) {
    console.log('✅ [SmartLog Test] Predictions component found and rendering');
  } else {
    console.warn('⚠️ [SmartLog Test] Predictions component not found on current page');
  }
};

const getPerformanceMetrics = () => {
  console.log('📊 [E2E Test] Performance Metrics Summary:', performanceMetrics);
  return performanceMetrics;
};

// Expose testing functions globally
if (typeof window !== 'undefined') {
  window.GPT5_TEST = {
    testVoiceLogging,
    testPhotoDetection,
    testSmartLogPredictions,
    getPerformanceMetrics
  };
  
  console.log('🧪 [E2E Testing] GPT-5 test utilities loaded. Use:');
  console.log('- window.GPT5_TEST.testVoiceLogging("In-N-Out Double-Double and fries")');
  console.log('- window.GPT5_TEST.testPhotoDetection(base64ImageString)');
  console.log('- window.GPT5_TEST.testSmartLogPredictions()');
  console.log('- window.GPT5_TEST.getPerformanceMetrics()');
}

export { testVoiceLogging, testPhotoDetection, testSmartLogPredictions, getPerformanceMetrics };