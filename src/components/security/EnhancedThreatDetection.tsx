import React, { useEffect, useCallback } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface ThreatPattern {
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export const EnhancedThreatDetection: React.FC = () => {
  const { user } = useAuth();

  // Advanced threat patterns
  const threatPatterns: ThreatPattern[] = [
    {
      pattern: /(\<script\>|javascript:|vbscript:|onload=|onerror=)/i,
      severity: 'critical',
      description: 'Script injection attempt detected'
    },
    {
      pattern: /(union.*select|drop.*table|insert.*into|update.*set)/i,
      severity: 'critical',
      description: 'SQL injection attempt detected'
    },
    {
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i,
      severity: 'high',
      description: 'Path traversal attempt detected'
    },
    {
      pattern: /(\${.*}|<%.*%>|{{.*}})/,
      severity: 'medium',
      description: 'Template injection attempt detected'
    },
    {
      pattern: /(eval\(|exec\(|system\(|shell_exec)/i,
      severity: 'critical',
      description: 'Code execution attempt detected'
    }
  ];

  // Monitor clipboard operations
  const monitorClipboard = useCallback(async () => {
    const originalWriteText = navigator.clipboard?.writeText;
    const originalReadText = navigator.clipboard?.readText;

    if (originalWriteText) {
      navigator.clipboard.writeText = async function(text: string) {
        // Check for sensitive data patterns
        const sensitivePatterns = [
          /password\s*[:=]\s*[^\s]+/i,
          /token\s*[:=]\s*[^\s]+/i,
          /key\s*[:=]\s*[^\s]+/i,
          /secret\s*[:=]\s*[^\s]+/i
        ];

        for (const pattern of sensitivePatterns) {
          if (pattern.test(text)) {
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
              eventDetails: {
                threat: 'sensitive_data_clipboard_write',
                dataLength: text.length,
                containsSensitive: true
              },
              severity: 'medium',
              userId: user?.id,
            });
            break;
          }
        }

        return originalWriteText.call(this, text);
      };
    }

    if (originalReadText) {
      navigator.clipboard.readText = async function() {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: {
            threat: 'clipboard_read_attempt',
            timestamp: new Date().toISOString()
          },
          severity: 'low',
          userId: user?.id,
        });

        return originalReadText.call(this);
      };
    }
  }, [user?.id]);

  // Monitor form inputs for malicious content
  const monitorFormInputs = useCallback(async () => {
    const handleInputChange = async (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !target.value) return;

      for (const { pattern, severity, description } of threatPatterns) {
        if (pattern.test(target.value)) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.XSS_ATTEMPT,
            eventDetails: {
              inputType: target.type,
              inputName: target.name,
              threat: description,
              patternMatched: pattern.source,
              inputLength: target.value.length
            },
            severity,
            userId: user?.id,
          });

          if (severity === 'critical') {
            toast.error('Security Warning: Potentially malicious input detected');
            target.value = ''; // Clear the malicious input
          }
          break;
        }
      }
    };

    // Monitor all input and textarea elements
    document.addEventListener('input', handleInputChange);
    document.addEventListener('paste', handleInputChange);

    return () => {
      document.removeEventListener('input', handleInputChange);
      document.removeEventListener('paste', handleInputChange);
    };
  }, [user?.id, threatPatterns]);

  // Monitor for suspicious network activity
  const monitorNetworkActivity = useCallback(async () => {
    const originalFetch = window.fetch;
    const requestCounts = new Map<string, { count: number; lastReset: number }>();

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input.toString();
      const now = Date.now();
      
      // Track request frequency per endpoint
      const endpointKey = new URL(url, window.location.origin).pathname;
      const current = requestCounts.get(endpointKey) || { count: 0, lastReset: now };
      
      // Reset counter every minute
      if (now - current.lastReset > 60000) {
        current.count = 0;
        current.lastReset = now;
      }
      
      current.count++;
      requestCounts.set(endpointKey, current);
      
      // Alert on excessive requests
      if (current.count > 100) { // More than 100 requests per minute to same endpoint
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          eventDetails: {
            endpoint: endpointKey,
            requestCount: current.count,
            timeWindow: '1minute',
            detection: 'client_side_monitoring'
          },
          severity: 'high',
          userId: user?.id,
        });

        toast.warning('Unusual network activity detected');
      }

      try {
        const response = await originalFetch.call(this, input, init);
        
        // Monitor for error responses that might indicate probing
        if (response.status === 401 || response.status === 403) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
            eventDetails: {
              url: url,
              statusCode: response.status,
              method: init?.method || 'GET'
            },
            severity: 'medium',
            userId: user?.id,
          });
        }

        return response;
      } catch (error) {
        await logSecurityEvent({
          eventType: 'network_error',
          eventDetails: {
            url: url,
            error: error instanceof Error ? error.message : 'Unknown error',
            method: init?.method || 'GET'
          },
          severity: 'low',
          userId: user?.id,
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [user?.id]);

  // Initialize threat detection
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    const initializeDetection = async () => {
      await monitorClipboard();
      cleanupFunctions.push(await monitorFormInputs());
      cleanupFunctions.push(await monitorNetworkActivity());
    };

    initializeDetection();

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [monitorClipboard, monitorFormInputs, monitorNetworkActivity]);

  return null; // This is a monitoring component with no UI
};