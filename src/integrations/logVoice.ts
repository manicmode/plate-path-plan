
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
    console.log('🔍 [sendToLogVoice] Starting request to log-voice function');
    console.log('🔍 [sendToLogVoice] Input text:', text);
    console.log('🔍 [sendToLogVoice] Input text length:', text.length);
    console.log('🔍 [sendToLogVoice] Input text type:', typeof text);
    
    const requestBody = { text };
    console.log('🔍 [sendToLogVoice] Request body:', requestBody);
    
    const response = await fetch('https://uzoiiijqtahohfafqirm.functions.supabase.co/log-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('🔍 [sendToLogVoice] Response received');
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
    console.log('🔍 [sendToLogVoice] Response data:', data);
    console.log('🔍 [sendToLogVoice] Data type:', typeof data);
    console.log('🔍 [sendToLogVoice] Data keys:', Object.keys(data || {}));
    
    // Handle both success and error responses from the enhanced edge function
    if (data.success && data.data) {
      return {
        message: JSON.stringify(data), // Return the full structured response
        success: true
      };
    } else {
      // Handle structured error responses
      return {
        message: JSON.stringify(data), // Return structured error for parsing in Camera.tsx
        success: false,
        error: data.errorMessage || data.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('❌ [sendToLogVoice] Network/parsing error:', error);
    console.error('❌ [sendToLogVoice] Error type:', typeof error);
    console.error('❌ [sendToLogVoice] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ [sendToLogVoice] Error message:', error instanceof Error ? error.message : error);
    return {
      message: JSON.stringify({
        success: false,
        errorType: 'NETWORK_ERROR',
        errorMessage: 'Unable to connect to the service',
        suggestions: ['Check your internet connection', 'Try again in a moment']
      }),
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};
