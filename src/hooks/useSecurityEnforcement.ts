import { useEffect, useCallback } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { XSSProtection, InputSecurity, AuthSecurity } from '@/lib/securityEnhancements';
import { toast } from 'sonner';

export const useSecurityEnforcement = () => {
  // Monitor and prevent XSS attempts
  const monitorXSSAttempts = useCallback(async () => {
    // Monitor for dangerous DOM manipulations
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for script injection
              if (element.tagName === 'SCRIPT' || 
                  element.innerHTML?.includes('<script') ||
                  element.innerHTML?.includes('javascript:')) {
                
                logSecurityEvent({
                  eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                  eventDetails: { 
                    threat: 'script_injection',
                    tagName: element.tagName,
                    content: element.innerHTML?.slice(0, 200)
                  },
                  severity: 'critical'
                });

                // Remove malicious content
                element.remove();
                toast.error('Malicious content blocked for your security');
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  // Validate all form submissions
  const validateFormSubmissions = useCallback(() => {
    const handleFormSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const validation = await InputSecurity.validateFormData(formData);
      
      if (!validation.isValid) {
        event.preventDefault();
        
        logSecurityEvent({
          eventType: SECURITY_EVENTS.INVALID_INPUT,
          eventDetails: {
            errors: validation.errors,
            form: form.id || form.className
          },
          severity: 'medium'
        });

        toast.error('Form contains invalid data. Please check your inputs.');
        return false;
      }
    };

    document.addEventListener('submit', handleFormSubmit);
    return () => document.removeEventListener('submit', handleFormSubmit);
  }, []);

  // Monitor session integrity
  const monitorSessionIntegrity = useCallback(async () => {
    const checkSession = async () => {
      const isValid = await AuthSecurity.validateSession();
      if (!isValid) {
        // Session is invalid, redirect to login
        window.location.href = '/auth';
      }
    };

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    
    // Check immediately
    checkSession();

    return () => clearInterval(interval);
  }, []);

  // Detect automation/bot behavior
  const detectAutomation = useCallback(() => {
    let mouseMovements = 0;
    let keystrokes = 0;
    let clicks = 0;
    const startTime = Date.now();

    const handleMouseMove = () => {
      mouseMovements++;
    };

    const handleKeydown = () => {
      keystrokes++;
    };

    const handleClick = () => {
      clicks++;
      
      // Check for suspicious rapid clicking
      const elapsed = Date.now() - startTime;
      if (clicks > 30 && elapsed < 5000) {
        logSecurityEvent({
          eventType: SECURITY_EVENTS.AUTOMATED_THREAT_DETECTION,
          eventDetails: {
            pattern: 'rapid_clicking',
            clicks,
            timeWindow: elapsed,
            humanScore: mouseMovements / (clicks || 1)
          },
          severity: 'medium'
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Monitor for data exfiltration attempts
  const monitorDataExfiltration = useCallback(() => {
    let copyCount = 0;
    const resetTime = 60000; // Reset counter every minute

    const handleCopy = async () => {
      copyCount++;
      
      if (copyCount > 10) {
        logSecurityEvent({
          eventType: SECURITY_EVENTS.BULK_DATA_EXPORT,
          eventDetails: {
            pattern: 'excessive_copying',
            copyCount,
            timeWindow: resetTime
          },
          severity: 'high'
        });

        toast.warning('Unusual copy activity detected');
      }
    };

    const resetCounter = () => {
      copyCount = 0;
    };

    document.addEventListener('copy', handleCopy);
    const interval = setInterval(resetCounter, resetTime);

    return () => {
      document.removeEventListener('copy', handleCopy);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Initialize all security monitors
    Promise.all([
      monitorXSSAttempts(),
      validateFormSubmissions(),
      monitorSessionIntegrity(),
      detectAutomation(),
      monitorDataExfiltration()
    ]).then(cleanups => {
      cleanupFunctions.push(...cleanups.filter(Boolean));
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [
    monitorXSSAttempts,
    validateFormSubmissions, 
    monitorSessionIntegrity,
    detectAutomation,
    monitorDataExfiltration
  ]);

  return {
    XSSProtection,
    InputSecurity,
    AuthSecurity
  };
};