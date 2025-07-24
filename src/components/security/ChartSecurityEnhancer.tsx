import React, { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';

export const ChartSecurityEnhancer: React.FC = () => {
  // Monitor for CSS injection attempts in chart components
  const monitorCSSInjection = useCallback(async () => {
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(async (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check if this looks like a chart component
              if (element.classList.contains('recharts-wrapper') || 
                  element.getAttribute('data-chart') ||
                  element.querySelector('[data-chart]')) {
                
                // Check for malicious CSS patterns
                const style = element.getAttribute('style') || '';
                const dangerousPatterns = [
                  /expression\s*\(/i,
                  /javascript\s*:/i,
                  /url\s*\(\s*['"]*javascript:/i,
                  /@import/i,
                  /behavior\s*:/i
                ];
                
                for (const pattern of dangerousPatterns) {
                  if (pattern.test(style)) {
                    // Remove malicious style
                    element.removeAttribute('style');
                    
                    await logSecurityEvent({
                      eventType: SECURITY_EVENTS.CSS_INJECTION_ATTEMPT,
                      eventDetails: {
                        context: 'chart_css_injection_blocked',
                        maliciousStyle: style.substring(0, 100),
                        elementTag: element.tagName
                      },
                      severity: 'critical'
                    });
                    
                    toast.error('Malicious CSS blocked in chart component');
                    break;
                  }
                }
                
                // Check for script injection attempts
                const scripts = element.querySelectorAll('script');
                if (scripts.length > 0) {
                  scripts.forEach(script => script.remove());
                  
                  await logSecurityEvent({
                    eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                    eventDetails: {
                      context: 'chart_script_injection_blocked',
                      scriptCount: scripts.length
                    },
                    severity: 'critical'
                  });
                  
                  toast.error('Script injection blocked in chart component');
                }
              }
            }
          });
        }
        
        // Monitor style changes
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const element = mutation.target as Element;
          if (element.closest('[data-chart]') || element.classList.contains('recharts-wrapper')) {
            const style = element.getAttribute('style') || '';
            
            if (style.includes('javascript:') || style.includes('expression(')) {
              element.removeAttribute('style');
              
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.CSS_INJECTION_ATTEMPT,
                eventDetails: {
                  context: 'chart_style_mutation_blocked',
                  maliciousStyle: style.substring(0, 100)
                },
                severity: 'high'
              });
              
              toast.warning('Suspicious style change blocked in chart');
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Enhanced CSP monitoring for chart components
  const enhanceContentSecurityPolicy = useCallback(async () => {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', async (event) => {
      if (event.violatedDirective.includes('style-src') || 
          event.violatedDirective.includes('script-src')) {
        
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.CSP_VIOLATION,
          eventDetails: {
            context: 'chart_csp_violation',
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
            sourceFile: event.sourceFile
          },
          severity: 'medium'
        });
      }
    });
  }, []);

  // Validate chart data for dangerous content
  const validateChartData = useCallback((data: any): boolean => {
    if (typeof data === 'string') {
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /expression\s*\(/i
      ];
      
      return !dangerousPatterns.some(pattern => pattern.test(data));
    }
    
    if (Array.isArray(data)) {
      return data.every(item => validateChartData(item));
    }
    
    if (data && typeof data === 'object') {
      return Object.values(data).every(value => validateChartData(value));
    }
    
    return true;
  }, []);

  // Monitor chart data injections
  const validateChartDataInDOM = useCallback(async () => {
    const chartElements = document.querySelectorAll('[data-chart]');
    
    chartElements.forEach(async (element) => {
      const chartData = element.getAttribute('data-chart');
      if (chartData) {
        try {
          const parsed = JSON.parse(chartData);
          if (!validateChartData(parsed)) {
            element.removeAttribute('data-chart');
            
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.CHART_SECURITY_VIOLATION,
              eventDetails: {
                context: 'chart_data_sanitized',
                maliciousData: chartData.substring(0, 100)
              },
              severity: 'high'
            });
            
            toast.error('Malicious chart data removed');
          }
        } catch {
          // Invalid JSON, remove it
          element.removeAttribute('data-chart');
        }
      }
    });
  }, [validateChartData]);

  useEffect(() => {
    // Initialize security enhancements
    const cleanupCSS = monitorCSSInjection();
    enhanceContentSecurityPolicy();
    
    // Initial chart data validation
    validateChartDataInDOM();
    
    // Periodic validation every 30 seconds
    const validationInterval = setInterval(validateChartDataInDOM, 30 * 1000);
    
    return () => {
      cleanupCSS.then(cleanup => cleanup && cleanup());
      clearInterval(validationInterval);
    };
  }, [monitorCSSInjection, enhanceContentSecurityPolicy, validateChartDataInDOM]);

  return null;
};