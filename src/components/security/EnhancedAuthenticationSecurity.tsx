import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { useAuth } from '@/contexts/auth/useAuth';

export const EnhancedAuthenticationSecurity: React.FC = () => {
  const { user } = useAuth();
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  useEffect(() => {
    // Generate device fingerprint for suspicious login detection
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx?.fillText('Device fingerprint', 2, 2);
      const canvasData = canvas.toDataURL();
      
      const fingerprint = btoa(
        navigator.userAgent +
        navigator.language +
        screen.width + 'x' + screen.height +
        new Date().getTimezoneOffset() +
        canvasData.slice(-50)
      );
      
      setDeviceFingerprint(fingerprint);
      return fingerprint;
    };

    const fp = generateFingerprint();
    
    // Store device fingerprint in sessionStorage for session validation
    const storedFp = sessionStorage.getItem('device_fingerprint');
    if (!storedFp) {
      sessionStorage.setItem('device_fingerprint', fp);
    } else if (storedFp !== fp) {
      // Device fingerprint changed - potential session hijacking
      logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          reason: 'device_fingerprint_mismatch',
          stored: storedFp.slice(0, 20),
          current: fp.slice(0, 20)
        },
        severity: 'high'
      });
      
      toast.warning('Device security check failed - please login again');
    }
  }, []);

  useEffect(() => {
    if (user) {
      setSessionStartTime(Date.now());
      
      // Log successful authentication with device info
      logSecurityEvent({
        eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
        eventDetails: {
          userId: user.id,
          deviceFingerprint: deviceFingerprint.slice(0, 20),
          userAgent: navigator.userAgent.slice(0, 100),
          timestamp: new Date().toISOString()
        },
        severity: 'low',
        userId: user.id
      });
    } else {
      setSessionStartTime(null);
    }
  }, [user, deviceFingerprint]);

  useEffect(() => {
    if (!sessionStartTime || !user) return;

    // Session timeout warning (30 minutes)
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const WARNING_TIME = 25 * 60 * 1000; // 25 minutes

    const checkSessionTimeout = () => {
      const now = Date.now();
      const sessionDuration = now - sessionStartTime;

      if (sessionDuration > WARNING_TIME && sessionDuration < SESSION_TIMEOUT) {
        toast.warning('Your session will expire in 5 minutes', {
          duration: 10000,
          action: {
            label: 'Extend Session',
            onClick: () => {
              setSessionStartTime(Date.now());
              toast.success('Session extended');
            }
          }
        });
      } else if (sessionDuration > SESSION_TIMEOUT) {
        logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: {
            reason: 'session_timeout',
            duration: sessionDuration,
            userId: user.id
          },
          severity: 'medium',
          userId: user.id
        });
        
        toast.error('Session expired for security - please login again');
        // Don't auto-logout here, let the auth context handle it
      }
    };

    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [sessionStartTime, user]);

  useEffect(() => {
    // Monitor for multiple tab activity
    const handleVisibilityChange = () => {
      if (document.hidden && user) {
        logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: {
            reason: 'tab_hidden',
            userId: user.id,
            timestamp: new Date().toISOString()
          },
          severity: 'low',
          userId: user.id
        });
      }
    };

    // Monitor for suspicious keyboard combinations
    const handleKeyDown = (event: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+C (Developer tools)
      if (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'C'))
      ) {
        logSecurityEvent({
          eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          eventDetails: {
            reason: 'dev_tools_attempt',
            keys: `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key}`,
            userId: user?.id
          },
          severity: 'low',
          userId: user?.id
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [user]);

  return null;
};