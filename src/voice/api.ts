import { supabase } from '@/integrations/supabase/client';

export interface VoiceTurnResponse {
  transcript: string;
  reply_text: string;
  tts_url?: string;
  tool_results?: Array<{
    tool_name: string;
    success: boolean;
    result?: any;
  }>;
  usage: {
    tokens_prompt: number;
    tokens_output: number;
    ms_asr: number;
    ms_tts: number;
    seconds_recorded: number;
  };
}

export interface VoiceMinutesResponse {
  plan_minutes: number;
  used_seconds_month: number;
  remaining_seconds: number;
  month_key: string;
}

export interface VoiceHealthResponse {
  enabled: boolean;
  provider_pings: {
    openai_asr: boolean;
    openai_tts: boolean;
    openai_llm: boolean;
  };
  last_error?: string;
}

export class VoiceCoachAPI {
  static async submitVoiceTurn(audioBlob: Blob, mimeType: string): Promise<VoiceTurnResponse> {
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Audio = btoa(String.fromCharCode(...uint8Array));

    const { data, error } = await supabase.functions.invoke('voice-turn', {
      body: {
        audio_blob: base64Audio,
        mime_type: mimeType,
      },
    });

    if (error) {
      throw new Error(`Voice turn failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response from voice turn API');
    }

    return data;
  }

  static async getMinuteUsage(): Promise<VoiceMinutesResponse> {
    const { data, error } = await supabase.functions.invoke('voice-minutes');

    if (error) {
      throw new Error(`Failed to get minute usage: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response from voice minutes API');
    }

    return data;
  }

  static async checkHealth(): Promise<VoiceHealthResponse> {
    const { data, error } = await supabase.functions.invoke('voice-health');

    if (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response from voice health API');
    }

    return data;
  }
}