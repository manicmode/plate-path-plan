
export interface LogVoiceRequest {
  text: string;
}

export interface LogVoiceResponse {
  ok: boolean;
  status: number;
  success: boolean;
  items: any[];
  model_used: string;
  fallback_used: boolean;
  originalText: string | null;
  preprocessedText: string | null;
  raw: any;
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


    const raw = await response.json();
    
    // Normalize item extraction
    const items = 
      Array.isArray(raw?.items) ? raw.items :
      Array.isArray(raw?.message?.items) ? raw.message.items : [];
    
    const itemsPath = 
      Array.isArray(raw?.items) ? "root.items" :
      Array.isArray(raw?.message?.items) ? "message.items" : "none";
    
    // Log raw response details
    console.info('[sendToLogVoice][RAW]', {
      ok: response.ok,
      status: response.status,
      rawBody: raw,
      itemsFoundPath: itemsPath,
      itemsLength: items.length
    });
    
    // Log GPT-5 performance metrics
    if (raw.processing_stats || raw.model_used) {
      console.log('🚀 [GPT-5 Voice] Performance metrics:', {
        model: raw.model_used || 'gpt-5-mini',
        latency_ms: latency,
        tokens: raw.processing_stats?.tokens,
        fallback_used: raw.fallback_used || false
      });
    }
    
    // Return structured object without nested JSON strings
    return {
      ok: response.ok,
      status: response.status,
      success: items.length > 0,
      items,
      model_used: raw?.model_used ?? "unknown",
      fallback_used: !!raw?.fallback_used,
      originalText: raw?.originalText ?? raw?.input_text ?? null,
      preprocessedText: raw?.preprocessedText ?? null,
      raw
    };
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
      ok: false,
      status: 0,
      success: false,
      items: [],
      model_used: "unknown",
      fallback_used: false,
      originalText: null,
      preprocessedText: null,
      raw: normalizedError,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};
