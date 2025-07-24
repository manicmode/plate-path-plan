import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  lastChecked: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const AutomatedSecurityCompliance: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState<string>('');

  // Check admin status
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(data?.role === 'admin');
    };

    checkAdminRole();
  }, [user]);

  // Automated security compliance checks
  const runComplianceAudit = async () => {
    if (!isAdmin) return;
    
    setIsRunning(true);
    const auditResults: ComplianceCheck[] = [];

    try {
      // 1. Check for recent security events
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentEvents } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', oneHourAgo);

      const criticalEvents = recentEvents?.filter(e => e.severity === 'critical').length || 0;
      auditResults.push({
        id: 'critical-events',
        name: 'Critical Security Events',
        description: 'Check for critical security events in the last hour',
        status: criticalEvents === 0 ? 'pass' : criticalEvents < 3 ? 'warning' : 'fail',
        lastChecked: new Date().toISOString(),
        details: `${criticalEvents} critical events found`,
        severity: criticalEvents === 0 ? 'low' : criticalEvents < 3 ? 'medium' : 'high'
      });

      // 2. Check for failed authentication attempts
      const failedLogins = recentEvents?.filter(e => e.event_type === 'login_failure').length || 0;
      auditResults.push({
        id: 'failed-auth',
        name: 'Failed Authentication Attempts',
        description: 'Monitor for excessive failed login attempts',
        status: failedLogins < 5 ? 'pass' : failedLogins < 15 ? 'warning' : 'fail',
        lastChecked: new Date().toISOString(),
        details: `${failedLogins} failed attempts in last hour`,
        severity: failedLogins < 5 ? 'low' : failedLogins < 15 ? 'medium' : 'high'
      });

      // 3. Check for suspicious input validation failures
      const inputViolations = recentEvents?.filter(e => 
        e.event_type === 'invalid_uuid' || 
        e.event_type === 'xss_attempt' || 
        e.event_type === 'sql_injection_attempt'
      ).length || 0;
      
      auditResults.push({
        id: 'input-validation',
        name: 'Input Validation Failures',
        description: 'Check for malicious input attempts',
        status: inputViolations === 0 ? 'pass' : inputViolations < 5 ? 'warning' : 'fail',
        lastChecked: new Date().toISOString(),
        details: `${inputViolations} validation failures`,
        severity: inputViolations === 0 ? 'low' : inputViolations < 5 ? 'medium' : 'critical'
      });

      // 4. Check rate limiting effectiveness
      const rateLimitEvents = recentEvents?.filter(e => e.event_type === 'rate_limit_exceeded').length || 0;
      auditResults.push({
        id: 'rate-limiting',
        name: 'Rate Limiting Effectiveness',
        description: 'Verify rate limiting is working properly',
        status: rateLimitEvents > 0 && rateLimitEvents < 10 ? 'pass' : rateLimitEvents >= 10 ? 'warning' : 'pending',
        lastChecked: new Date().toISOString(),
        details: `${rateLimitEvents} rate limit violations (expected some)`,
        severity: rateLimitEvents < 20 ? 'low' : 'medium'
      });

      // 5. Check for data access patterns
      const dataAccessEvents = recentEvents?.filter(e => e.event_type === 'sensitive_data_access').length || 0;
      auditResults.push({
        id: 'data-access',
        name: 'Sensitive Data Access Monitoring',
        description: 'Monitor access to sensitive data',
        status: dataAccessEvents < 50 ? 'pass' : dataAccessEvents < 100 ? 'warning' : 'fail',
        lastChecked: new Date().toISOString(),
        details: `${dataAccessEvents} data access events`,
        severity: dataAccessEvents < 50 ? 'low' : dataAccessEvents < 100 ? 'medium' : 'high'
      });

      // 6. Check for unusual user activity
      const suspiciousActivity = recentEvents?.filter(e => e.event_type === 'suspicious_activity').length || 0;
      auditResults.push({
        id: 'suspicious-activity',
        name: 'Suspicious User Activity',
        description: 'Detect unusual user behavior patterns',
        status: suspiciousActivity === 0 ? 'pass' : suspiciousActivity < 3 ? 'warning' : 'fail',
        lastChecked: new Date().toISOString(),
        details: `${suspiciousActivity} suspicious activities detected`,
        severity: suspiciousActivity === 0 ? 'low' : suspiciousActivity < 3 ? 'medium' : 'critical'
      });

      // 7. Storage security check
      const storageKeys = Object.keys(localStorage);
      const invalidStorageKeys = storageKeys.filter(key => 
        localStorage.getItem(key) === 'undefined' || 
        localStorage.getItem(key) === 'null' ||
        (key.includes('_id') && localStorage.getItem(key) === '')
      );

      auditResults.push({
        id: 'storage-security',
        name: 'Local Storage Security',
        description: 'Check for invalid or malformed storage data',
        status: invalidStorageKeys.length === 0 ? 'pass' : invalidStorageKeys.length < 5 ? 'warning' : 'fail',
        lastChecked: new Date().toISOString(),
        details: `${invalidStorageKeys.length} invalid storage entries`,
        severity: invalidStorageKeys.length === 0 ? 'low' : 'medium'
      });

      setChecks(auditResults);
      setLastAuditTime(new Date().toISOString());

      // Log audit completion
      await logSecurityEvent({
        eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
        eventDetails: {
          action: 'automated_security_audit',
          totalChecks: auditResults.length,
          passedChecks: auditResults.filter(c => c.status === 'pass').length,
          failedChecks: auditResults.filter(c => c.status === 'fail').length,
          warningChecks: auditResults.filter(c => c.status === 'warning').length
        },
        severity: 'low'
      });

      // Show summary notification
      const failedCount = auditResults.filter(c => c.status === 'fail').length;
      const warningCount = auditResults.filter(c => c.status === 'warning').length;

      if (failedCount > 0) {
        toast.error(`Security audit completed: ${failedCount} failed checks require attention`);
      } else if (warningCount > 0) {
        toast.warning(`Security audit completed: ${warningCount} warnings found`);
      } else {
        toast.success('Security audit completed: All checks passed');
      }

    } catch (error) {
      console.error('Security audit error:', error);
      toast.error('Security audit failed to complete');
    } finally {
      setIsRunning(false);
    }
  };

  // Automated periodic audits
  useEffect(() => {
    if (!isAdmin) return;

    // Run initial audit
    runComplianceAudit();

    // Set up periodic audits (every 30 minutes)
    const auditInterval = setInterval(runComplianceAudit, 30 * 60 * 1000);

    return () => clearInterval(auditInterval);
  }, [isAdmin]);

  if (!isAdmin) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {/* Floating security compliance indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Shield className="h-4 w-4 mr-2" />
          Security Compliance
          {checks.filter(c => c.status === 'fail').length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {checks.filter(c => c.status === 'fail').length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Compliance dashboard modal */}
      {isVisible && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Automated Security Compliance
                  </CardTitle>
                  <CardDescription>
                    Real-time security monitoring and compliance checks
                    {lastAuditTime && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last audit: {new Date(lastAuditTime).toLocaleString()}
                      </div>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runComplianceAudit}
                    disabled={isRunning}
                  >
                    {isRunning ? 'Running...' : 'Run Audit'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsVisible(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {checks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <div className="font-medium">{check.name}</div>
                        <div className="text-sm text-muted-foreground">{check.description}</div>
                        {check.details && (
                          <div className="text-xs text-muted-foreground mt-1">{check.details}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {check.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {checks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No compliance checks available. Click "Run Audit" to perform security checks.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};