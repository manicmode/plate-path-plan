import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth/useAuth';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

interface ThreatMetrics {
  requestCount: number;
  errorCount: number;
  suspiciousPatterns: string[];
  lastActivity: number;
}

export const useAdvancedThreatDetection = () => {
  const { user } = useAuth();
  const userMetrics = new Map<string, ThreatMetrics>();

  const detectAnomalousActivity = useCallback(async (activity: string, metadata?: any) => {
    if (!user) return;

    const userId = user.id;
    const current = userMetrics.get(userId) || {
      requestCount: 0,
      errorCount: 0,
      suspiciousPatterns: [],
      lastActivity: Date.now()
    };

    const timeDiff = Date.now() - current.lastActivity;
    
    // Reset counters if more than 5 minutes since last activity
    if (timeDiff > 300000) {
      current.requestCount = 0;
      current.errorCount = 0;
      current.suspiciousPatterns = [];
    }

    current.requestCount++;
    current.lastActivity = Date.now();

    // Detect rapid requests (potential bot behavior)
    if (current.requestCount > 50 && timeDiff < 60000) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          type: 'rapid_requests',
          count: current.requestCount,
          timeWindow: timeDiff,
          activity,
          metadata
        },
        severity: 'high',
        userId
      });
      toast.error('Unusual activity detected. Please slow down.');
    }

    // Detect suspicious patterns
    const suspiciousKeywords = ['script', 'eval', 'document.cookie', 'javascript:', 'data:'];
    const activityStr = JSON.stringify({ activity, metadata }).toLowerCase();
    
    for (const keyword of suspiciousKeywords) {
      if (activityStr.includes(keyword) && !current.suspiciousPatterns.includes(keyword)) {
        current.suspiciousPatterns.push(keyword);
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.XSS_ATTEMPT,
          eventDetails: {
            pattern: keyword,
            activity,
            metadata
          },
          severity: 'critical',
          userId
        });
      }
    }

    userMetrics.set(userId, current);
  }, [user, userMetrics]);

  const monitorNetworkRequests = useCallback(() => {
    const originalFetch = window.fetch;
    let requestCount = 0;

    window.fetch = async (...args) => {
      requestCount++;
      
      // Monitor for excessive requests
      if (requestCount > 100) {
        await detectAnomalousActivity('excessive_network_requests', {
          count: requestCount,
          url: args[0]
        });
      }

      try {
        const response = await originalFetch(...args);
        
        // Monitor for suspicious response patterns
        if (response.status === 401 || response.status === 403) {
          await detectAnomalousActivity('unauthorized_request', {
            status: response.status,
            url: args[0]
          });
        }

        return response;
      } catch (error) {
        await detectAnomalousActivity('network_error', {
          error: error.message,
          url: args[0]
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [detectAnomalousActivity]);

  const monitorLocalStorage = useCallback(() => {
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = function(key, value) {
      // Monitor for suspicious storage patterns
      const suspiciousKeys = ['token', 'password', 'credit', 'admin'];
      if (suspiciousKeys.some(k => key.toLowerCase().includes(k))) {
        detectAnomalousActivity('suspicious_storage', {
          key,
          valueLength: value.length
        });
      }

      return originalSetItem.call(this, key, value);
    };

    return () => {
      localStorage.setItem = originalSetItem;
    };
  }, [detectAnomalousActivity]);

  useEffect(() => {
    const cleanupNetwork = monitorNetworkRequests();
    const cleanupStorage = monitorLocalStorage();

    return () => {
      cleanupNetwork();
      cleanupStorage();
    };
  }, [monitorNetworkRequests, monitorLocalStorage]);

  return {
    detectAnomalousActivity
  };
};