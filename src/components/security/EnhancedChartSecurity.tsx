import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';

export const EnhancedChartSecurity: React.FC = () => {
  useEffect(() => {
    // Enhanced CSS injection patterns for chart components
    const dangerousPatterns = [
      /expression\s*\(/i,
      /javascript\s*:/i,
      /on\w+\s*=/i,
      /@import/i,
      /url\s*\(\s*['"]*javascript:/i,
      /\<script/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i
    ];

    const validateChartCSS = (element: Element) => {
      const styles = window.getComputedStyle(element);
      const inlineStyle = element.getAttribute('style') || '';
      const cssText = styles.cssText + inlineStyle;
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(cssText)) {
          logSecurityEvent({
            eventType: SECURITY_EVENTS.CSS_INJECTION_ATTEMPT,
            eventDetails: {
              pattern: pattern.source,
              element: element.tagName,
              cssText: cssText.substring(0, 100)
            },
            severity: 'high'
          });
          
          // Remove dangerous styles
          element.removeAttribute('style');
          toast.error('Dangerous chart styling detected and removed');
          return false;
        }
      }
      return true;
    };

    const monitorChartElements = () => {
      const chartElements = document.querySelectorAll('[data-chart], .recharts-wrapper, [class*="chart"]');
      chartElements.forEach(validateChartCSS);
    };

    // Enhanced mutation observer for chart components
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.matches('[data-chart], .recharts-wrapper, [class*="chart"]')) {
                validateChartCSS(element);
              }
            }
          });
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as Element;
          if (target.matches('[data-chart], .recharts-wrapper, [class*="chart"]')) {
            validateChartCSS(target);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Initial scan
    monitorChartElements();
    
    // Periodic security check
    const interval = setInterval(monitorChartElements, 30000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null;
};