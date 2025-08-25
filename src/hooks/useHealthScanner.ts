import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logEvent } from '@/lib/telemetry';

export interface HealthScanRequest {
  mode: 'scan' | 'barcode' | 'voice' | 'text';
  imageBase64?: string;
  barcode?: string;
  text?: string;
  userId?: string;
}

export interface HealthScanResponse {
  success: boolean;
  data?: {
    productName?: string;
    brand?: string;
    nutrients?: Record<string, any>;
    ingredients?: string[];
    allergens?: string[];
    additives?: string[];
    offId?: string;
    nova?: number;
    healthScore?: number;
    barcodeFound?: boolean;
    brandConfidence?: number;
    plateConfidence?: number;
  };
  error?: string;
}

export const useHealthScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<HealthScanResponse | null>(null);

  const scanWithHealthScanner = async (request: HealthScanRequest): Promise<HealthScanResponse> => {
    setIsScanning(true);
    const startTime = Date.now();
    
    try {
      logEvent('health_scanner.request', { 
        mode: request.mode,
        hasImage: !!request.imageBase64,
        hasBarcode: !!request.barcode 
      });

      const { data, error } = await supabase.functions.invoke('enhanced-health-scanner', {
        body: request
      });

      const elapsedMs = Date.now() - startTime;

      if (error) {
        throw new Error(error.message || 'Health scan failed');
      }

      const result: HealthScanResponse = {
        success: true,
        data: data
      };

      logEvent('health_scanner.success', { 
        mode: request.mode,
        elapsedMs,
        hasProduct: !!data?.productName,
        healthScore: data?.healthScore 
      });

      setScanResult(result);
      return result;

    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      console.error('Health scanner error:', error);
      
      logEvent('health_scanner.error', { 
        mode: request.mode,
        elapsedMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const result: HealthScanResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Health scan failed'
      };

      setScanResult(result);
      toast.error('Health scan failed. Please try again.');
      return result;

    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setScanResult(null);
    setIsScanning(false);
  };

  return {
    isScanning,
    scanResult,
    scanWithHealthScanner,
    reset
  };
};