
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
    const response = await fetch('https://uzoiiijqtahohfafqirm.functions.supabase.co/log-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
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
    console.error('Error calling log-voice API:', error);
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
