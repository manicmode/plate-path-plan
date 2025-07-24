import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Clock } from 'lucide-react';

interface SecurityMetrics {
  criticalAlerts: number;
  highAlerts: number;
  totalEvents: number;
  lastCheck: string;
  recentThreats: Array<{
    type: string;
    severity: string;
    timestamp: string;
  }>;
}

export const AdvancedSecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    criticalAlerts: 0,
    highAlerts: 0,
    totalEvents: 0,
    lastCheck: new Date().toISOString(),
    recentThreats: []
  });

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

  // Enhanced security monitoring with real-time threat detection
  useEffect(() => {
    if (!isAdmin) return;

    const monitorSecurityEvents = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: events, error } = await supabase
          .from('security_events')
          .select('*')
          .gte('created_at', oneHourAgo)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const criticalCount = events?.filter(e => e.severity === 'critical').length || 0;
        const highCount = events?.filter(e => e.severity === 'high').length || 0;
        const recentThreats = events?.slice(0, 5).map(e => ({
          type: e.event_type,
          severity: e.severity,
          timestamp: e.created_at
        })) || [];

        // Check for critical pattern: rapid security events
        if (events && events.length > 50) {
          await logSecurityEvent({
            eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
            eventDetails: {
              pattern: 'high_security_event_volume',
              eventCount: events.length,
              timeWindow: '1_hour'
            },
            severity: 'critical'
          });

          toast.error('High volume of security events detected! Immediate review required.');
        }

        // Alert on new critical threats
        const newCritical = events?.filter(e => 
          e.severity === 'critical' && 
          new Date(e.created_at) > new Date(Date.now() - 5 * 60 * 1000)
        );

        if (newCritical && newCritical.length > 0) {
          toast.error(`${newCritical.length} new critical security alerts detected!`);
        }

        setMetrics({
          criticalAlerts: criticalCount,
          highAlerts: highCount,
          totalEvents: events?.length || 0,
          lastCheck: new Date().toISOString(),
          recentThreats
        });

        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'advanced_security_monitoring',
            criticalCount,
            highCount,
            totalEvents: events?.length || 0
          },
          severity: 'low'
        });

      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    };

    // Initial check
    monitorSecurityEvents();

    // Set up real-time monitoring
    const interval = setInterval(monitorSecurityEvents, 30000); // Every 30 seconds

    // Real-time subscription for critical events
    const subscription = supabase
      .channel('critical-security-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events',
        filter: 'severity=eq.critical'
      }, (payload) => {
        toast.error(`Critical security alert: ${payload.new.event_type}`, {
          description: 'Immediate attention required',
          action: {
            label: 'View Details',
            onClick: () => window.open(`/admin/security-logs?event=${payload.new.id}`, '_blank')
          }
        });
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [isAdmin]);

  // Enhanced threat pattern detection
  useEffect(() => {
    const detectThreatPatterns = async () => {
      if (!isAdmin) return;

      try {
        // Check for coordinated attacks
        const { data: recentEvents } = await supabase
          .from('security_events')
          .select('event_type, created_at, event_details')
          .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (recentEvents && recentEvents.length > 0) {
          // Detect potential DDoS patterns
          const rapidEvents = recentEvents.filter(e => 
            e.event_type === 'rate_limit_exceeded' || 
            e.event_type === 'unauthorized_access'
          );

          if (rapidEvents.length > 20) {
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
              eventDetails: {
                pattern: 'potential_ddos_attack',
                rapidEventCount: rapidEvents.length,
                timeWindow: '10_minutes'
              },
              severity: 'critical'
            });

            toast.error('Potential DDoS attack detected! System may be under attack.');
          }

          // Detect credential stuffing attempts
          const loginFailures = recentEvents.filter(e => e.event_type === 'login_failure');
          if (loginFailures.length > 15) {
            await logSecurityEvent({
              eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
              eventDetails: {
                pattern: 'credential_stuffing_attempt',
                failureCount: loginFailures.length,
                timeWindow: '10_minutes'
              },
              severity: 'critical'
            });

            toast.error('Potential credential stuffing attack detected!');
          }
        }
      } catch (error) {
        console.error('Threat pattern detection error:', error);
      }
    };

    if (isAdmin) {
      const threatInterval = setInterval(detectThreatPatterns, 60000); // Every minute
      return () => clearInterval(threatInterval);
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  const hasActiveThreat = metrics.criticalAlerts > 0 || metrics.highAlerts > 5;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {hasActiveThreat && (
        <Alert className="border-destructive bg-destructive/10 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Active Security Threats Detected
            <div className="text-sm mt-1">
              {metrics.criticalAlerts > 0 && (
                <div className="text-destructive">Critical: {metrics.criticalAlerts}</div>
              )}
              {metrics.highAlerts > 0 && (
                <div className="text-orange-600">High: {metrics.highAlerts}</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-muted/50 border-border">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Security Monitor</span>
            <span className="text-xs text-muted-foreground">
              Last: {new Date(metrics.lastCheck).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Events (1h):</span>
              <span className={metrics.totalEvents > 100 ? 'text-orange-600' : 'text-muted-foreground'}>
                {metrics.totalEvents}
              </span>
            </div>
            
            {metrics.recentThreats.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs font-medium mb-1">Recent Threats:</div>
                {metrics.recentThreats.slice(0, 3).map((threat, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="truncate mr-2">{threat.type}</span>
                    <span className={`px-1 rounded text-xs ${
                      threat.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      threat.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {threat.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};