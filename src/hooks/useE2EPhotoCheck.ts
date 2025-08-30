/**
 * E2E Photo Check Hook for Health Check Modal Integration
 * Provides the same E2E photo checking functionality for use in other components
 */

import { useState, useRef, useCallback } from 'react';
import { resolveFunctionsBase } from '@/lib/net/functionsBase';
import { getAuthHeaders } from '@/lib/net/authHeaders';
import { toReportFromOCR } from '@/lib/health/adapters/toReportInputFromOCR';
import { useToast } from '@/hooks/use-toast';

interface E2EResult {
  success: boolean;
  ocrResult?: any;
  healthReport?: any;
  duration: number;
  error?: string;
}

export const useE2EPhotoCheck = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<E2EResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const runE2ECheck = useCallback(async (blob: Blob): Promise<E2EResult> => {
    const startTime = Date.now();
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setIsRunning(true);
      
      // Get auth headers
      const headers = await getAuthHeaders(true);
      
      // POST to /vision-ocr
      const functionsBase = resolveFunctionsBase();
      const url = `${functionsBase}/vision-ocr`;
      
      const formData = new FormData();
      formData.append('image', blob, 'health-check-photo.jpg');

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers,
        signal: abortControllerRef.current.signal
      });
      
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = `HTTP ${response.status}`;
        const result = { success: false, duration, error };
        setLastResult(result);
        return result;
      }

      const ocrResult = await response.json();
      
      // Process through health pipeline if OCR succeeded
      let healthReport = null;
      
      if (ocrResult.ok && ocrResult.summary?.text_joined) {
        try {
          const healthResult = await toReportFromOCR(ocrResult.summary.text_joined);
          if (healthResult.ok) {
            healthReport = healthResult.report;
          }
        } catch (healthError) {
          console.warn('Health analysis failed:', healthError);
        }
      }

      const result = {
        success: true,
        ocrResult,
        healthReport,
        duration
      };
      
      setLastResult(result);
      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        const result = { success: false, duration, error: 'Aborted' };
        setLastResult(result);
        return result;
      }

      const result = { success: false, duration, error: error.message };
      setLastResult(result);
      return result;
      
    } finally {
      setIsRunning(false);
    }
  }, []);

  const abortCheck = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    runE2ECheck,
    abortCheck,
    isRunning,
    lastResult
  };
};