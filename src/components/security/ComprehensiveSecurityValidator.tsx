import React, { useEffect } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { XSSProtection, InputSecurity, AuthSecurity } from '@/lib/securityEnhancements';
import { toast } from 'sonner';

export const ComprehensiveSecurityValidator: React.FC = () => {
  
  useEffect(() => {
    // Enhanced XSS protection
    const protectAgainstXSS = () => {
      // Monitor for dangerous DOM manipulations instead of overriding innerHTML
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
    };

    // Enhanced form validation
    const enhanceFormSecurity = () => {
      document.addEventListener('submit', async (event) => {
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        
        const validation = await InputSecurity.validateFormData(formData);
        
        if (!validation.isValid) {
          event.preventDefault();
          
          // Add visual feedback
          form.classList.add('security-error');
          setTimeout(() => form.classList.remove('security-error'), 3000);
          
          logSecurityEvent({
            eventType: SECURITY_EVENTS.INVALID_INPUT,
            eventDetails: {
              errors: validation.errors,
              formId: form.id,
              formAction: form.action
            },
            severity: 'medium'
          });

          toast.error('Form validation failed: ' + validation.errors.join(', '));
        }
      });
    };

    // Monitor authentication integrity
    const monitorAuthIntegrity = () => {
      const checkAuthState = async () => {
        const isValid = await AuthSecurity.validateSession();
        if (!isValid) {
          logSecurityEvent({
            eventType: SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
            eventDetails: {
              event: 'invalid_session_detected',
              action: 'session_cleanup'
            },
            severity: 'high'
          });
        }
      };

      // Check on storage changes
      window.addEventListener('storage', checkAuthState);
      
      // Periodic checks
      const interval = setInterval(checkAuthState, 2 * 60 * 1000); // Every 2 minutes
      
      return () => {
        window.removeEventListener('storage', checkAuthState);
        clearInterval(interval);
      };
    };

    // Detect suspicious network activity
    const monitorNetworkActivity = () => {
      const originalFetch = window.fetch;
      let requestCount = 0;
      const resetTime = 60000; // 1 minute

      window.fetch = async (...args) => {
        requestCount++;
        
        // Check for excessive requests
        if (requestCount > 200) {
          logSecurityEvent({
            eventType: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
            eventDetails: {
              requestCount,
              timeWindow: resetTime,
              url: args[0]?.toString()
            },
            severity: 'high'
          });
        }

        return originalFetch.apply(window, args);
      };

      // Reset counter periodically
      const resetCounter = () => { requestCount = 0; };
      const interval = setInterval(resetCounter, resetTime);

      return () => {
        window.fetch = originalFetch;
        clearInterval(interval);
      };
    };

    // Monitor clipboard for data exfiltration
    const monitorClipboard = () => {
      let copyEvents = 0;
      const threshold = 15;
      const timeWindow = 60000; // 1 minute

      const handleCopy = () => {
        copyEvents++;
        
        if (copyEvents > threshold) {
          logSecurityEvent({
            eventType: SECURITY_EVENTS.BULK_DATA_EXPORT,
            eventDetails: {
              copyEvents,
              threshold,
              timeWindow
            },
            severity: 'medium'
          });

          toast.warning('Unusual clipboard activity detected');
        }
      };

      const resetCounter = () => { copyEvents = 0; };

      document.addEventListener('copy', handleCopy);
      const interval = setInterval(resetCounter, timeWindow);

      return () => {
        document.removeEventListener('copy', handleCopy);
        clearInterval(interval);
      };
    };

    // Add security-related CSS
    const addSecurityStyles = () => {
      const style = document.createElement('style');
      style.textContent = `
        .security-error {
          border: 2px solid #ef4444 !important;
          animation: securityShake 0.5s ease-in-out;
        }
        
        @keyframes securityShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .security-warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 8px 12px;
          margin: 4px 0;
        }
      `;
      document.head.appendChild(style);
    };

    // Initialize all security measures
    const cleanupFunctions: (() => void)[] = [];

    try {
      const xssCleanup = protectAgainstXSS();
      enhanceFormSecurity();
      addSecurityStyles();
      
      cleanupFunctions.push(
        xssCleanup,
        monitorAuthIntegrity(),
        monitorNetworkActivity(),
        monitorClipboard()
      );
      
      console.log('✅ Comprehensive security validation initialized');
      
    } catch (error) {
      console.error('❌ Security initialization error:', error);
      
      logSecurityEvent({
        eventType: SECURITY_EVENTS.CRITICAL_ERROR,
        eventDetails: {
          error: error instanceof Error ? error.message : 'Unknown error',
          context: 'security_initialization'
        },
        severity: 'critical'
      });
    }

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup?.());
    };
  }, []);

  return null;
};