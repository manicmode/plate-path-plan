
export interface LogVoiceRequest {
  text: string;
}

export interface LogVoiceResponse {
  message: string;
  success: boolean;
  error?: string;
}

export const sendToLogVoice = async (text: string): Promise<LogVoiceResponse> => {
  try {
    console.log('🚀 [GPT-5 Voice] Starting request to log-voice-gpt5 function');
    console.log('🚀 [GPT-5 Voice] Input text:', text);
    const startTime = Date.now();
    
    // Get current session for authenticated request
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ [sendToLogVoice] Auth session error:', sessionError);
      throw new Error('User not authenticated. Please log in and try again.');
    }
    
    console.log('🔍 [sendToLogVoice] Session found, user authenticated');
    
    const requestBody = { text };
    console.log('🔍 [sendToLogVoice] Request body:', requestBody);
    
    const response = await fetch('https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/log-voice-gpt5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const latency = Date.now() - startTime;
    console.log('🚀 [GPT-5 Voice] Response received in', latency, 'ms');
    console.log('🔍 [sendToLogVoice] Response status:', response.status);
    console.log('🔍 [sendToLogVoice] Response ok:', response.ok);
    console.log('🔍 [sendToLogVoice] Response headers:', Object.fromEntries(response.headers.entries()));


    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [sendToLogVoice] HTTP error response:', errorText);
      console.error('❌ [sendToLogVoice] Response status:', response.status);
      console.error('❌ [sendToLogVoice] Response status text:', response.statusText);
      
      // Try to parse the error response for better error messages
      try {
        const errorData = JSON.parse(errorText);
        return {
          message: JSON.stringify(errorData),
          success: false,
          error: errorData.errorMessage || `HTTP ${response.status}: ${response.statusText}`
        };
      } catch {
        return {
          message: JSON.stringify({
            success: false,
            errorType: 'HTTP_ERROR',
            errorMessage: `Request failed with status ${response.status}`,
            suggestions: ['Check your internet connection', 'Try again in a moment'],
            details: errorText
          }),
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    }

    const data = await response.json();
    
    // Log GPT-5 performance metrics
    if (data.processing_stats || data.model_used) {
      console.log('🚀 [GPT-5 Voice] Performance metrics:', {
        model: data.model_used || 'gpt-5-mini',
        latency_ms: latency,
        tokens: data.processing_stats?.tokens,
        fallback_used: data.fallback_used || false
      });
    }
    
    console.log('🚀 [GPT-5 Voice] Response data:', data);
    
    // Normalize response JSON structure
    if (data.success && data.items) {
      // Successful response with items - ensure clean JSON structure
      const normalizedData = {
        success: true,
        items: data.items,
        originalText: data.originalText || '',
        model_used: data.model_used,
        processing_stats: data.processing_stats,
        fallback_used: data.fallback_used
      };
      return {
        message: JSON.stringify(normalizedData),
        success: true
      };
    } else {
      // Handle structured error responses - ensure clean JSON structure
      const normalizedError = {
        success: false,
        errorType: data.errorType || 'PROCESSING_ERROR',
        errorMessage: data.errorMessage || data.error || 'Unknown error occurred',
        suggestions: data.suggestions || []
      };
      return {
        message: JSON.stringify(normalizedError),
        success: false,
        error: normalizedError.errorMessage
      };
    }
  } catch (error) {
    console.error('❌ [sendToLogVoice] Network/parsing error:', error);
    console.error('❌ [sendToLogVoice] Error type:', typeof error);
    console.error('❌ [sendToLogVoice] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ [sendToLogVoice] Error message:', error instanceof Error ? error.message : error);
    
    // Normalize network errors
    const normalizedError = {
      success: false,
      errorType: 'NETWORK_ERROR',
      errorMessage: 'Unable to connect to the service',
      suggestions: ['Check your internet connection', 'Try again in a moment']
    };
    
    return {
      message: JSON.stringify(normalizedError),
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};
