import { useEffect } from 'react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { useAuth } from '@/contexts/auth';

interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

export const useCSPViolationReporting = () => {
  const { user } = useAuth();

  useEffect(() => {
    const handleCSPViolation = async (event: SecurityPolicyViolationEvent) => {
      const violationReport: Partial<CSPViolationReport> = {
        'document-uri': event.documentURI,
        'violated-directive': event.violatedDirective,
        'effective-directive': event.effectiveDirective,
        'original-policy': event.originalPolicy,
        'blocked-uri': event.blockedURI,
        'line-number': event.lineNumber,
        'column-number': event.columnNumber,
        'source-file': event.sourceFile,
        'status-code': event.statusCode,
        'script-sample': event.sample
      };

      // Log CSP violation as a security event
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        eventDetails: {
          violationType: 'csp_violation',
          report: violationReport,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        severity: 'high',
        userId: user?.id
      });

      // Log to console for development
      console.warn('CSP Violation detected:', violationReport);
    };

    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, [user?.id]);

  return {
    // Could expose methods to manually report violations if needed
  };
};