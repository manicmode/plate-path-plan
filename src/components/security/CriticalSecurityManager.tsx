import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { cleanupInvalidUuids } from '@/lib/uuidValidationMiddleware';
import { cleanupNotificationPreferences } from '@/lib/notificationValidation';
import { toast } from 'sonner';

interface SecurityIssue {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  action?: () => Promise<void>;
  resolved?: boolean;
}

export const CriticalSecurityManager: React.FC = () => {
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    const checkSecurityIssues = async () => {
      const issues: SecurityIssue[] = [];

      // Check for UUID validation issues
      const uuidIssues = localStorage.getItem('uuid_validation_errors');
      if (uuidIssues) {
        issues.push({
          id: 'uuid_validation',
          type: 'high',
          message: 'Invalid UUID data detected in storage',
          action: async () => {
            const cleaned = cleanupInvalidUuids();
            if (cleaned > 0) {
              localStorage.removeItem('uuid_validation_errors');
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
                eventDetails: { action: 'uuid_cleanup_manual', cleanedCount: cleaned },
                severity: 'medium'
              });
            }
          }
        });
      }

      // Check for notification constraint violations
      const notificationIssues = localStorage.getItem('notification_constraint_errors');
      if (notificationIssues) {
        issues.push({
          id: 'notification_constraints',
          type: 'medium',
          message: 'Invalid notification preferences detected',
          action: async () => {
            const cleaned = await cleanupNotificationPreferences();
            if (cleaned > 0) {
              localStorage.removeItem('notification_constraint_errors');
              await logSecurityEvent({
                eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
                eventDetails: { action: 'notification_cleanup_manual', cleanedCount: cleaned },
                severity: 'low'
              });
            }
          }
        });
      }

      // Check for CSP violations
      const cspViolations = sessionStorage.getItem('csp_violations');
      if (cspViolations) {
        try {
          const violations = JSON.parse(cspViolations);
          if (violations.length > 0) {
            issues.push({
              id: 'csp_violations',
              type: 'critical',
              message: `${violations.length} Content Security Policy violations detected`,
              action: async () => {
                sessionStorage.removeItem('csp_violations');
                await logSecurityEvent({
                  eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
                  eventDetails: { 
                    action: 'csp_violations_cleared',
                    violationCount: violations.length,
                    violations: violations.slice(0, 5) // Log first 5 for analysis
                  },
                  severity: 'high'
                });
              }
            });
          }
        } catch (error) {
          // Invalid JSON, clear it
          sessionStorage.removeItem('csp_violations');
        }
      }

      setSecurityIssues(issues);
    };

    checkSecurityIssues();
    
    // Check every 30 seconds
    const interval = setInterval(checkSecurityIssues, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const repairAllIssues = async () => {
    setIsRepairing(true);
    try {
      let repairedCount = 0;
      
      for (const issue of securityIssues) {
        if (issue.action) {
          try {
            await issue.action();
            repairedCount++;
            setSecurityIssues(prev => 
              prev.map(i => i.id === issue.id ? { ...i, resolved: true } : i)
            );
          } catch (error) {
            console.error(`Failed to repair issue ${issue.id}:`, error);
          }
        }
      }
      
      if (repairedCount > 0) {
        toast.success(`Repaired ${repairedCount} security issues`);
        
        // Log repair action
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: { 
            action: 'bulk_security_repair',
            repairedCount,
            timestamp: new Date().toISOString()
          },
          severity: 'medium'
        });
      }
      
      // Remove resolved issues after a delay
      setTimeout(() => {
        setSecurityIssues(prev => prev.filter(issue => !issue.resolved));
      }, 2000);
      
    } catch (error) {
      console.error('Failed to repair security issues:', error);
      toast.error('Failed to repair some security issues');
    } finally {
      setIsRepairing(false);
    }
  };

  if (securityIssues.length === 0) {
    return null;
  }

  const criticalIssues = securityIssues.filter(issue => issue.type === 'critical').length;
  const highIssues = securityIssues.filter(issue => issue.type === 'high').length;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {securityIssues.map((issue) => (
        <Alert
          key={issue.id}
          variant={issue.type === 'critical' ? 'destructive' : 'default'}
          className={`
            ${issue.resolved ? 'opacity-50' : 'opacity-100'}
            ${issue.type === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
            ${issue.type === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : ''}
            ${issue.type === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}
          `}
        >
          <div className="flex items-center space-x-2">
            {issue.resolved ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : issue.type === 'critical' ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Shield className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-sm">{issue.message}</span>
              {issue.resolved && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                  Resolved
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
      
      {securityIssues.some(issue => !issue.resolved) && (
        <div className="flex justify-end">
          <Button
            onClick={repairAllIssues}
            disabled={isRepairing}
            size="sm"
            variant={criticalIssues > 0 ? 'destructive' : highIssues > 0 ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {isRepairing ? (
              'Repairing...'
            ) : (
              `Repair All (${securityIssues.filter(i => !i.resolved).length})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};