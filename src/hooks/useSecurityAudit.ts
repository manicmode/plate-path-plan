import { useCallback } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditResult {
  score: number;
  issues: SecurityIssue[];
  recommendations: string[];
}

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

export const useSecurityAudit = () => {
  const performClientSideAudit = useCallback(async (): Promise<SecurityAuditResult> => {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    // Check for unsafe DOM methods
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.innerHTML.includes('eval(') || script.innerHTML.includes('Function(')) {
        issues.push({
          type: 'unsafe_code_execution',
          severity: 'critical',
          description: 'Potentially unsafe code execution detected in script',
          location: `Script element ${i}`
        });
      }
    }

    // Check for insecure local storage usage
    const storageKeys = Object.keys(localStorage);
    const sensitiveKeys = storageKeys.filter(key => 
      key.toLowerCase().includes('token') || 
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret')
    );

    if (sensitiveKeys.length > 0) {
      issues.push({
        type: 'sensitive_data_storage',
        severity: 'medium',
        description: 'Potentially sensitive data found in localStorage',
        location: `Keys: ${sensitiveKeys.join(', ')}`
      });
      recommendations.push('Consider using secure token storage methods');
    }

    // Check for missing security headers
    const securityHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options'
    ];

    const missingHeaders = securityHeaders.filter(header => {
      const metaTag = document.querySelector(`meta[http-equiv="${header}"]`);
      return !metaTag;
    });

    if (missingHeaders.length > 0) {
      issues.push({
        type: 'missing_security_headers',
        severity: 'medium',
        description: `Missing security headers: ${missingHeaders.join(', ')}`,
      });
      recommendations.push('Implement comprehensive security headers');
    }

    // Check for inline event handlers
    const elementsWithInlineEvents = document.querySelectorAll('[onclick], [onload], [onerror]');
    if (elementsWithInlineEvents.length > 0) {
      issues.push({
        type: 'inline_event_handlers',
        severity: 'low',
        description: `Found ${elementsWithInlineEvents.length} elements with inline event handlers`,
      });
      recommendations.push('Replace inline event handlers with proper event listeners');
    }

    // Calculate security score
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    const score = Math.max(0, 100 - (criticalCount * 40) - (highCount * 20) - (mediumCount * 10) - (lowCount * 5));

    // Log audit completion
    await logSecurityEvent({
      eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
      eventDetails: {
        audit_type: 'client_side',
        issues_found: issues.length,
        score,
        critical_issues: criticalCount,
        high_issues: highCount
      },
      severity: score < 70 ? 'high' : score < 85 ? 'medium' : 'low'
    });

    return {
      score,
      issues,
      recommendations
    };
  }, []);

  const performDatabaseAudit = useCallback(async (): Promise<SecurityAuditResult> => {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    try {
      // Check for recent security events (simplified check)
      const { data: recentCriticalEvents, error: criticalEventsError } = await supabase
        .from('security_events')
        .select('count')
        .eq('severity', 'critical')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!criticalEventsError && recentCriticalEvents && recentCriticalEvents.length > 5) {
        issues.push({
          type: 'high_critical_activity',
          severity: 'high',
          description: 'High number of critical security events detected',
        });
        recommendations.push('Review recent critical security events');
      }

      // Check for recent security events
      const { data: recentEvents, error: eventsError } = await supabase
        .from('security_events')
        .select('event_type, severity')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('severity', 'critical');

      if (!eventsError && recentEvents && recentEvents.length > 0) {
        issues.push({
          type: 'recent_critical_events',
          severity: 'high',
          description: `${recentEvents.length} critical security events in the last 24 hours`,
        });
        recommendations.push('Review and address recent critical security events');
      }

      const score = Math.max(0, 100 - (issues.length * 15));

      return {
        score,
        issues,
        recommendations
      };
    } catch (error) {
      return {
        score: 50,
        issues: [{
          type: 'audit_failure',
          severity: 'high',
          description: 'Database audit failed to complete',
        }],
        recommendations: ['Check database connectivity and permissions']
      };
    }
  }, []);

  const performFullAudit = useCallback(async (): Promise<SecurityAuditResult> => {
    const [clientAudit, databaseAudit] = await Promise.all([
      performClientSideAudit(),
      performDatabaseAudit()
    ]);

    const combinedIssues = [...clientAudit.issues, ...databaseAudit.issues];
    const combinedRecommendations = [...clientAudit.recommendations, ...databaseAudit.recommendations];
    const averageScore = Math.round((clientAudit.score + databaseAudit.score) / 2);

    await logSecurityEvent({
      eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
      eventDetails: {
        audit_type: 'full_security_audit',
        client_score: clientAudit.score,
        database_score: databaseAudit.score,
        combined_score: averageScore,
        total_issues: combinedIssues.length
      },
      severity: averageScore < 70 ? 'high' : averageScore < 85 ? 'medium' : 'low'
    });

    return {
      score: averageScore,
      issues: combinedIssues,
      recommendations: combinedRecommendations
    };
  }, [performClientSideAudit, performDatabaseAudit]);

  return {
    performClientSideAudit,
    performDatabaseAudit,
    performFullAudit
  };
};