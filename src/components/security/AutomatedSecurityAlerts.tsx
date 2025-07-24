import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield } from 'lucide-react';

interface SecurityMetrics {
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  totalEvents: number;
  lastCheck: Date;
}

export const AutomatedSecurityAlerts: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    criticalAlerts: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    totalEvents: 0,
    lastCheck: new Date()
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
          
        setIsAdmin(data?.role === 'admin');
      } catch (error) {
        console.warn('Failed to check admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user?.id]);

  // Monitor security events
  useEffect(() => {
    if (!isAdmin) return;

    const checkSecurityEvents = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: events, error } = await supabase
          .from('security_events')
          .select('severity, event_type, created_at')
          .gte('created_at', oneHourAgo)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const newMetrics: SecurityMetrics = {
          criticalAlerts: events?.filter(e => e.severity === 'critical').length || 0,
          highAlerts: events?.filter(e => e.severity === 'high').length || 0,
          mediumAlerts: events?.filter(e => e.severity === 'medium').length || 0,
          totalEvents: events?.length || 0,
          lastCheck: new Date()
        };

        // Alert on critical events
        if (newMetrics.criticalAlerts > metrics.criticalAlerts) {
          const newCritical = newMetrics.criticalAlerts - metrics.criticalAlerts;
          toast.error(`${newCritical} new critical security alert${newCritical > 1 ? 's' : ''}!`, {
            duration: 10000,
            action: {
              label: 'View',
              onClick: () => window.open('/admin/security-logs', '_blank')
            }
          });
        }

        // Alert on high severity events
        if (newMetrics.highAlerts > metrics.highAlerts) {
          const newHigh = newMetrics.highAlerts - metrics.highAlerts;
          toast.warning(`${newHigh} new high-priority security event${newHigh > 1 ? 's' : ''}`, {
            duration: 5000
          });
        }

        setMetrics(newMetrics);

        // Log monitoring activity
        await logSecurityEvent({
          eventType: SECURITY_EVENTS.SENSITIVE_DATA_ACCESS,
          eventDetails: {
            action: 'security_monitoring_check',
            metrics: newMetrics,
            context: 'automated_alerts'
          },
          severity: 'low'
        });

      } catch (error) {
        console.error('Failed to check security events:', error);
      }
    };

    // Initial check
    checkSecurityEvents();

    // Set up periodic monitoring
    const interval = setInterval(checkSecurityEvents, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isAdmin, metrics.criticalAlerts, metrics.highAlerts]);

  // Set up real-time monitoring
  useEffect(() => {
    if (!isAdmin) return;

    const subscription = supabase
      .channel('security_events')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'security_events',
          filter: 'severity=eq.critical'
        }, 
        (payload) => {
          toast.error('Critical security event detected!', {
            description: `Event: ${payload.new.event_type}`,
            duration: 10000,
            action: {
              label: 'View Details',
              onClick: () => window.open('/admin/security-logs', '_blank')
            }
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isAdmin]);

  if (!isAdmin || metrics.totalEvents === 0) return null;

  return (
    <Alert className="fixed top-4 right-4 w-80 z-50 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span className="font-medium">Security Monitor</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {metrics.lastCheck.toLocaleTimeString()}
          </div>
        </div>
        <div className="mt-1 space-y-1">
          {metrics.criticalAlerts > 0 && (
            <div className="text-red-600 font-medium">
              Critical: {metrics.criticalAlerts}
            </div>
          )}
          {metrics.highAlerts > 0 && (
            <div className="text-orange-600">
              High: {metrics.highAlerts}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Total events (1h): {metrics.totalEvents}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};