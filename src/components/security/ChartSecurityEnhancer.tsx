import { useEffect, useCallback } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

export const ChartSecurityEnhancer = () => {
  const monitorCSSInjection = useCallback(async () => {
    // Monitor for potential CSS injection in chart components
    const chartElements = document.querySelectorAll('[class*="recharts"], [class*="chart"]');
    
    chartElements.forEach((element) => {
      const observer = new MutationObserver(async (mutations) => {
        mutations.forEach(async (mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const styleValue = (mutation.target as HTMLElement).style.cssText;
            
            // Check for potential CSS injection patterns
            const dangerousPatterns = [
              /javascript:/i,
              /expression\s*\(/i,
              /url\s*\(\s*["']?\s*javascript:/i,
              /@import/i,
              /behavior\s*:/i,
              /-moz-binding/i,
              /vbscript:/i
            ];
            
            const hasDangerousPattern = dangerousPatterns.some(pattern => 
              pattern.test(styleValue)
            );
            
            if (hasDangerousPattern) {
              // Remove the dangerous style
              (mutation.target as HTMLElement).removeAttribute('style');
              
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                eventDetails: {
                  action: 'css_injection_attempt_blocked',
                  element: mutation.target.nodeName,
                  dangerousStyle: styleValue,
                  context: 'chart_security_enhancer'
                },
                severity: 'high'
              });
              
              toast.error('Potential CSS injection blocked in chart component');
            }
          }
          
          // Monitor for script injection in chart data
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(async (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const textContent = element.textContent || '';
                
                // Check for script injection patterns
                const scriptPatterns = [
                  /<script/i,
                  /javascript:/i,
                  /on\w+\s*=/i,
                  /eval\s*\(/i,
                  /setTimeout\s*\(/i,
                  /setInterval\s*\(/i
                ];
                
                const hasScriptPattern = scriptPatterns.some(pattern => 
                  pattern.test(textContent)
                );
                
                if (hasScriptPattern) {
                  // Remove the dangerous element
                  element.remove();
                  
                  await logSecurityEvent({
                    eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                    eventDetails: {
                      action: 'script_injection_attempt_blocked',
                      element: element.nodeName,
                      dangerousContent: textContent.substring(0, 200),
                      context: 'chart_security_enhancer'
                    },
                    severity: 'critical'
                  });
                  
                  toast.error('Script injection attempt blocked in chart component');
                }
              }
            });
          }
        });
      });
      
      observer.observe(element, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['style', 'class', 'data-*']
      });
    });
  }, []);

  const enhanceContentSecurityPolicy = useCallback(() => {
    // Add runtime CSP monitoring for chart components
    const reportCSPViolation = async (event: SecurityPolicyViolationEvent) => {
      if (event.violatedDirective.includes('style') || event.violatedDirective.includes('script')) {
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.CSP_VIOLATION,
          eventDetails: {
            action: 'chart_csp_violation',
            directive: event.violatedDirective,
            blockedURI: event.blockedURI,
            sourceFile: event.sourceFile,
            lineNumber: event.lineNumber,
            context: 'chart_security_enhancer'
          },
          severity: 'medium'
        });
      }
    };
    
    document.addEventListener('securitypolicyviolation', reportCSPViolation);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', reportCSPViolation);
    };
  }, []);

  const validateChartData = useCallback(async (data: any): Promise<boolean> => {
    if (!data || typeof data !== 'object') {
      return true; // Allow non-object data
    }
    
    const checkForDangerousContent = (obj: any): boolean => {
      if (typeof obj === 'string') {
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /data:text\/html/i,
          /vbscript:/i,
          /@import/i
        ];
        
        return dangerousPatterns.some(pattern => pattern.test(obj));
      }
      
      if (Array.isArray(obj)) {
        return obj.some(item => checkForDangerousContent(item));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkForDangerousContent(value));
      }
      
      return false;
    };
    
    const hasDangerousContent = checkForDangerousContent(data);
    
    if (hasDangerousContent) {
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.XSS_ATTEMPT,
        eventDetails: {
          action: 'chart_data_validation_failed',
          dataType: typeof data,
          context: 'chart_security_enhancer'
        },
        severity: 'high'
      });
      
      return false;
    }
    
    return true;
  }, []);

  // Monitor chart data validation without React patching
  const validateChartDataInDOM = useCallback(() => {
    // Look for chart elements and validate their data attributes
    const chartElements = document.querySelectorAll('[data-chart], [class*="recharts"]');
    
    chartElements.forEach(element => {
      const dataAttributes = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => attr.value);
      
      dataAttributes.forEach(async (value) => {
        try {
          const parsedData = JSON.parse(value);
          const isValid = await validateChartData(parsedData);
          
          if (!isValid) {
            console.warn('Chart data validation failed for element:', element);
            element.removeAttribute('data-chart');
          }
        } catch {
          // Not JSON data, skip validation
        }
      });
    });
  }, [validateChartData]);

  useEffect(() => {
    // Set up chart security monitoring
    monitorCSSInjection();
    
    // Enhance CSP monitoring
    const cleanupCSP = enhanceContentSecurityPolicy();
    
    // Validate chart data in DOM
    validateChartDataInDOM();
    
    // Set up periodic security checks
    const securityCheckInterval = setInterval(() => {
      monitorCSSInjection();
    }, 30 * 1000); // Every 30 seconds
    
    return () => {
      cleanupCSP();
      clearInterval(securityCheckInterval);
    };
  }, [monitorCSSInjection, enhanceContentSecurityPolicy, validateChartDataInDOM]);

  return null;
};