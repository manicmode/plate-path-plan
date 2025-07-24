import { useEffect, useCallback } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { detectSecurityThreats, checkClientRateLimit } from '@/lib/securityHeaders';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface SecurityAlert {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  // Monitor for security threats
  const performSecurityCheck = useCallback(async () => {
    const threats = detectSecurityThreats();
    
    for (const threat of threats) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: { threat, url: window.location.href },
        severity: 'high',
        userId: user?.id,
      });
      
      // Show user-friendly warning for critical threats
      if (threat === 'iframe_embedding_detected') {
        toast.warning('Security Notice: This page is being displayed in an iframe, which may indicate a security risk.');
      }
    }
  }, [user?.id]);

  // Monitor for rapid-fire requests (potential automated attacks)
  const checkActivityRateLimit = useCallback(async (action: string) => {
    const identifier = `${user?.id || 'anonymous'}_${action}`;
    const allowed = checkClientRateLimit(identifier, 20, 60000); // 20 requests per minute
    
    if (!allowed) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
        eventDetails: { action, identifier },
        severity: 'medium',
        userId: user?.id,
      });
      
      toast.error('Too many requests. Please slow down.');
      return false;
    }
    
    return true;
  }, [user?.id]);

  // Monitor for suspicious navigation patterns
  const monitorNavigation = useCallback(async (path: string) => {
    // Check for potential path traversal attempts
    if (path.includes('../') || path.includes('..\\') || /%2e%2e/i.test(path)) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: { 
          threat: 'path_traversal_attempt', 
          path,
          userAgent: navigator.userAgent 
        },
        severity: 'high',
        userId: user?.id,
      });
    }
    
    // Check for excessively long URLs (potential buffer overflow)
    if (path.length > 2048) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: { 
          threat: 'oversized_url', 
          pathLength: path.length,
          userAgent: navigator.userAgent 
        },
        severity: 'medium',
        userId: user?.id,
      });
    }
  }, [user?.id]);

  // Monitor for console manipulation (developer tools abuse)
  const monitorConsole = useCallback(async () => {
    // Detect if console is open (basic detection)
    let devtools = { open: false };
    
    setInterval(() => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          logSecurityEvent({
            eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
            eventDetails: { 
              threat: 'devtools_opened',
              timestamp: new Date().toISOString()
            },
            severity: 'low',
            userId: user?.id,
          });
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }, [user?.id]);

  // Monitor for clipboard access attempts
  const monitorClipboard = useCallback(async () => {
    const originalReadText = navigator.clipboard?.readText;
    
    if (originalReadText) {
      navigator.clipboard.readText = async function() {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: { 
            threat: 'clipboard_access_attempt',
            userAgent: navigator.userAgent
          },
          severity: 'low',
          userId: user?.id,
        });
        
        return originalReadText.call(this);
      };
    }
  }, [user?.id]);

  // Initialize security monitoring
  useEffect(() => {
    performSecurityCheck();
    monitorConsole();
    monitorClipboard();
    
    // Perform periodic security checks
    const interval = setInterval(performSecurityCheck, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [performSecurityCheck, monitorConsole, monitorClipboard]);

  // Monitor page visibility changes (tab switching detection)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await logSecurityEvent({
          eventType: 'tab_hidden',
          eventDetails: { 
            timestamp: new Date().toISOString(),
            url: window.location.href
          },
          severity: 'low',
          userId: user?.id,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

  return {
    checkActivityRateLimit,
    monitorNavigation,
    performSecurityCheck,
  };
};