import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';

interface AuditResult {
  score: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  timestamp: Date;
}

export const SecurityAuditAutomation: React.FC = () => {
  const { user } = useAuth();
  const [lastAudit, setLastAudit] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const performAutomatedAudit = async (): Promise<AuditResult> => {
    const issues: AuditResult['issues'] = [];
    let score = 100;

    // Check for localStorage security issues
    try {
      const storageKeys = Object.keys(localStorage);
      const sensitiveKeywords = ['password', 'token', 'secret', 'key', 'auth'];
      
      storageKeys.forEach(key => {
        const value = localStorage.getItem(key) || '';
        
        // Check for sensitive data in localStorage
        if (sensitiveKeywords.some(keyword => key.toLowerCase().includes(keyword))) {
          issues.push({
            type: 'SENSITIVE_DATA_STORAGE',
            severity: 'medium',
            description: `Sensitive data found in localStorage: ${key}`,
            recommendation: 'Use secure storage or session storage for sensitive data'
          });
          score -= 5;
        }
        
        // Check for invalid UUID values
        if ((key.includes('_id') || key.includes('Id')) && (value === 'undefined' || value === 'null' || value === '')) {
          issues.push({
            type: 'INVALID_UUID_STORAGE',
            severity: 'medium',
            description: `Invalid UUID in storage: ${key}`,
            recommendation: 'Clean up invalid UUID values from storage'
          });
          score -= 3;
        }
      });
    } catch (error) {
      issues.push({
        type: 'STORAGE_ACCESS_ERROR',
        severity: 'low',
        description: 'Could not access localStorage for security audit',
        recommendation: 'Ensure localStorage is available and accessible'
      });
      score -= 2;
    }

    // Check for recent security events
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from('security_events')
        .select('severity, event_type')
        .gte('created_at', oneHourAgo);

      const criticalEvents = events?.filter(e => e.severity === 'critical').length || 0;
      const highEvents = events?.filter(e => e.severity === 'high').length || 0;

      if (criticalEvents > 0) {
        issues.push({
          type: 'CRITICAL_SECURITY_EVENTS',
          severity: 'critical',
          description: `${criticalEvents} critical security events in the last hour`,
          recommendation: 'Investigate and resolve critical security issues immediately'
        });
        score -= 20;
      }

      if (highEvents > 5) {
        issues.push({
          type: 'HIGH_SECURITY_EVENTS',
          severity: 'high',
          description: `${highEvents} high-severity security events in the last hour`,
          recommendation: 'Review and address high-severity security issues'
        });
        score -= 10;
      }
    } catch (error) {
      issues.push({
        type: 'DATABASE_AUDIT_ERROR',
        severity: 'medium',
        description: 'Could not access security events for audit',
        recommendation: 'Ensure database connection is stable for security monitoring'
      });
      score -= 5;
    }

    // Check for DOM security issues
    try {
      const scripts = document.querySelectorAll('script[src]');
      const inlineEventHandlers = document.querySelectorAll('[onclick], [onload], [onerror]');
      
      if (inlineEventHandlers.length > 0) {
        issues.push({
          type: 'INLINE_EVENT_HANDLERS',
          severity: 'medium',
          description: `${inlineEventHandlers.length} inline event handlers found`,
          recommendation: 'Use addEventListener instead of inline event handlers'
        });
        score -= 5;
      }

      // Check for external scripts without integrity checks
      const externalScripts = Array.from(scripts).filter(script => {
        const src = script.getAttribute('src') || '';
        return src.startsWith('http') && !script.hasAttribute('integrity');
      });

      if (externalScripts.length > 0) {
        issues.push({
          type: 'EXTERNAL_SCRIPTS_NO_INTEGRITY',
          severity: 'medium',
          description: `${externalScripts.length} external scripts without integrity checks`,
          recommendation: 'Add integrity attributes to external scripts'
        });
        score -= 3;
      }
    } catch (error) {
      issues.push({
        type: 'DOM_AUDIT_ERROR',
        severity: 'low',
        description: 'Could not perform DOM security audit',
        recommendation: 'Ensure DOM is accessible for security checks'
      });
      score -= 2;
    }

    // Check browser security features
    try {
      if (!window.isSecureContext) {
        issues.push({
          type: 'INSECURE_CONTEXT',
          severity: 'high',
          description: 'Application is not running in a secure context',
          recommendation: 'Ensure HTTPS is enabled for production'
        });
        score -= 15;
      }

      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        issues.push({
          type: 'MISSING_CSP',
          severity: 'medium',
          description: 'Content Security Policy not found',
          recommendation: 'Implement Content Security Policy headers'
        });
        score -= 5;
      }
    } catch (error) {
      issues.push({
        type: 'BROWSER_SECURITY_CHECK_ERROR',
        severity: 'low',
        description: 'Could not check browser security features',
        recommendation: 'Ensure browser compatibility for security features'
      });
      score -= 2;
    }

    return {
      score: Math.max(0, score),
      issues,
      timestamp: new Date()
    };
  };

  const runAudit = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    try {
      const result = await performAutomatedAudit();
      setLastAudit(result);

      // Log audit completion
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: {
          action: 'automated_security_audit',
          score: result.score,
          issuesCount: result.issues.length,
          criticalIssues: result.issues.filter(i => i.severity === 'critical').length,
          highIssues: result.issues.filter(i => i.severity === 'high').length,
          context: 'security_audit_automation'
        },
        severity: result.score < 70 ? 'high' : 'medium',
        userId: user?.id
      });

      // Show notification based on score
      if (result.score < 50) {
        toast.error(`Security audit failed with score ${result.score}/100. Immediate attention required!`);
      } else if (result.score < 70) {
        toast.warning(`Security audit completed with score ${result.score}/100. Please review issues.`);
      } else if (result.score < 90) {
        toast.info(`Security audit completed with score ${result.score}/100. Minor improvements suggested.`);
      }

    } catch (error) {
      console.error('Automated security audit failed:', error);
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          action: 'automated_audit_failure',
          error: error instanceof Error ? error.message : 'Unknown error',
          context: 'security_audit_automation'
        },
        severity: 'medium',
        userId: user?.id
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Automated audit scheduling
  useEffect(() => {
    // Run initial audit after 30 seconds
    const initialTimer = setTimeout(runAudit, 30000);
    
    // Run audit every 30 minutes
    const interval = setInterval(runAudit, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user?.id]);

  return null; // This component runs background audits
};