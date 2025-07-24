import React, { useEffect } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';

// CSS security patterns
const CSS_SECURITY_PATTERNS = {
  EXPRESSION: /expression\s*\(/i,
  JAVASCRIPT_URL: /javascript:/i,
  DATA_URL: /url\s*\(\s*data:/i,
  IMPORT: /@import/i,
  BINDING: /-moz-binding/i,
  BEHAVIOR: /behavior\s*:/i,
  SCRIPT_SRC: /src\s*=.*javascript:/i
};

export const ChartSecurityEnhancer: React.FC = () => {
  
  useEffect(() => {
    // Enhanced CSS injection monitoring
    const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
    const originalSetAttribute = Element.prototype.setAttribute;

    // Override CSS property setting
    CSSStyleDeclaration.prototype.setProperty = function(property: string, value: string | null, priority?: string) {
      if (value) {
        for (const [threatType, pattern] of Object.entries(CSS_SECURITY_PATTERNS)) {
          if (pattern.test(value)) {
            logSecurityEvent({
              eventType: SECURITY_EVENTS.XSS_ATTEMPT,
              eventDetails: {
                threatType: `CSS_${threatType}`,
                property,
                value: value.substring(0, 100),
                context: 'css_injection_prevention',
                location: window.location.pathname
              },
              severity: 'critical'
            });
            
            console.warn(`Blocked potentially malicious CSS: ${property}: ${value}`);
            return; // Block the operation
          }
        }
      }
      
      return originalSetProperty.call(this, property, value, priority);
    };

    // Override element attribute setting for style attributes
    Element.prototype.setAttribute = function(name: string, value: string) {
      if (name.toLowerCase() === 'style' && value) {
        for (const [threatType, pattern] of Object.entries(CSS_SECURITY_PATTERNS)) {
          if (pattern.test(value)) {
            logSecurityEvent({
              eventType: SECURITY_EVENTS.XSS_ATTEMPT,
              eventDetails: {
                threatType: `STYLE_${threatType}`,
                attribute: name,
                value: value.substring(0, 100),
                context: 'style_attribute_injection',
                element: this.tagName,
                location: window.location.pathname
              },
              severity: 'critical'
            });
            
            console.warn(`Blocked potentially malicious style attribute: ${value}`);
            return; // Block the operation
          }
        }
      }
      
      return originalSetAttribute.call(this, name, value);
    };

    // Monitor chart container creation and modification
    const observeChartContainers = () => {
      const chartContainers = document.querySelectorAll('[class*="recharts"], [class*="chart"], .chart-container');
      
      chartContainers.forEach(container => {
        // Add security attributes
        container.setAttribute('data-security-monitored', 'true');
        
        // Monitor for suspicious modifications
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
              const target = mutation.target as Element;
              const styleValue = target.getAttribute('style') || '';
              
              for (const [threatType, pattern] of Object.entries(CSS_SECURITY_PATTERNS)) {
                if (pattern.test(styleValue)) {
                  logSecurityEvent({
                    eventType: SECURITY_EVENTS.XSS_ATTEMPT,
                    eventDetails: {
                      threatType: `CHART_${threatType}`,
                      element: target.tagName,
                      className: target.className,
                      styleValue: styleValue.substring(0, 100),
                      context: 'chart_security_monitoring'
                    },
                    severity: 'high'
                  });
                  
                  // Remove the malicious style
                  target.removeAttribute('style');
                }
              }
            }
          });
        });
        
        observer.observe(container, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          subtree: true
        });
      });
    };

    // Initial scan and periodic monitoring
    observeChartContainers();
    const interval = setInterval(observeChartContainers, 10000); // Every 10 seconds

    // Monitor for dynamic chart creation
    const documentObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.className && (
              element.className.includes('recharts') || 
              element.className.includes('chart') ||
              element.querySelector('[class*="recharts"], [class*="chart"]')
            )) {
              // New chart detected, apply monitoring
              setTimeout(observeChartContainers, 100);
            }
          }
        });
      });
    });

    documentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Enhanced Content Security Policy for charts
    const addChartCSP = () => {
      const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!existingMeta) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none';";
        document.head.appendChild(meta);
      }
    };

    addChartCSP();

    return () => {
      // Restore original methods
      CSSStyleDeclaration.prototype.setProperty = originalSetProperty;
      Element.prototype.setAttribute = originalSetAttribute;
      
      // Cleanup observers
      clearInterval(interval);
      documentObserver.disconnect();
    };
  }, []);

  return null; // This component only adds security monitoring
};