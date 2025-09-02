/**
 * GPT Detection Diagnostics Utilities
 * Zero-side-effect diagnostic harness for testing GPT pipeline
 */

import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  stage: string;
  status?: number;
  duration_ms?: number;
  raw_text?: string;
  model?: string;
  usage?: any;
  error?: any;
  has_key?: boolean;
  image_bytes?: number;
  image_mime?: string;
  timestamp: string;
}

export class GPTDIAG {
  static async run(testCase: 'hello' | 'image', imageB64?: string): Promise<DiagnosticResult> {
    console.info('[GPTDIAG] Running test:', testCase);
    
    try {
      const { data, error } = await supabase.functions.invoke('gpt-detect-diag', {
        body: { 
          test_case: testCase,
          image_b64: testCase === 'image' ? imageB64 : undefined
        }
      });

      if (error) {
        console.error('[GPTDIAG] Supabase error:', error);
        return {
          stage: 'supabase_error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      console.info('[GPTDIAG] Result:', data);
      return data;
      
    } catch (error) {
      console.error('[GPTDIAG] Client error:', error);
      return {
        stage: 'client_error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  static async hello(): Promise<DiagnosticResult> {
    return this.run('hello');
  }
  
  static async image(imageBase64: string): Promise<DiagnosticResult> {
    return this.run('image', imageBase64);
  }
}

// Expose to window for dev console access
if (typeof window !== 'undefined') {
  (window as any).GPTDIAG = GPTDIAG;
}