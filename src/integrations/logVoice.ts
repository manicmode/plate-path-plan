
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
    
    // Handle the new structured response from the updated edge function
    if (data.success && data.data) {
      return {
        message: JSON.stringify(data.data), // Convert structured data back to string for parsing in Camera.tsx
        success: true
      };
    } else {
      return {
        message: '',
        success: false,
        error: data.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    console.error('Error calling log-voice API:', error);
    return {
      message: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
