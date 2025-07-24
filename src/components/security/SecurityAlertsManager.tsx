import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/securityLogger';
import { useAuth } from '@/contexts/auth';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';

interface SecurityAlert {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_details: any;
  created_at: string;
  user_id?: string;
}

export const SecurityAlertsManager: React.FC = () => {
  const { user } = useAuth();
  const [alertStats, setAlertStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    total: 0
  });

  // Real-time security alerts monitoring
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events',
          filter: `severity=eq.critical`
        },
        (payload) => {
          const alert = payload.new as SecurityAlert;
          
          // Show critical alert notification
          toast.error(`Critical Security Alert: ${alert.event_type}`, {
            description: `Detected at ${new Date(alert.created_at).toLocaleTimeString()}`,
            duration: 10000,
          });

          // Log admin notification
          logSecurityEvent({
            eventType: 'security_alert_notification',
            eventDetails: {
              originalEvent: alert.event_type,
              alertId: alert.id,
              severity: alert.severity
            },
            severity: 'medium',
            userId: user.id,
          });

          // Update stats
          setAlertStats(prev => ({
            ...prev,
            critical: prev.critical + 1,
            total: prev.total + 1
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load recent alert statistics
  useEffect(() => {
    const loadAlertStats = async () => {
      if (!user) return;

      try {
        const { data: recentAlerts, error } = await supabase
          .from('security_events')
          .select('severity')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        const stats = recentAlerts.reduce((acc, alert) => {
          acc[alert.severity as keyof typeof acc]++;
          acc.total++;
          return acc;
        }, { critical: 0, high: 0, medium: 0, total: 0 });

        setAlertStats(stats);
      } catch (error) {
        console.warn('Failed to load alert statistics:', error);
      }
    };

    loadAlertStats();
  }, [user]);

  // Automated security health check
  useEffect(() => {
    const performHealthCheck = async () => {
      if (!user) return;

      try {
        // Check for unusual activity patterns
        const { data: recentActivity, error } = await supabase
          .from('security_events')
          .select('event_type, created_at, user_id')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Analyze for suspicious patterns
        const userActivity = recentActivity.reduce((acc: Record<string, number>, event) => {
          if (event.user_id) {
            acc[event.user_id] = (acc[event.user_id] || 0) + 1;
          }
          return acc;
        }, {});

        // Flag users with excessive activity
        Object.entries(userActivity).forEach(([userId, count]) => {
          if (count > 50) { // More than 50 security events in an hour
            logSecurityEvent({
              eventType: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
              eventDetails: {
                suspiciousUserId: userId,
                eventCount: count,
                timeWindow: '1hour',
                detection: 'automated_health_check'
              },
              severity: 'high',
              userId: user.id,
            });
          }
        });

      } catch (error) {
        console.warn('Security health check failed:', error);
      }
    };

    // Run health check every 30 minutes
    const interval = setInterval(performHealthCheck, 30 * 60 * 1000);
    performHealthCheck(); // Run immediately

    return () => clearInterval(interval);
  }, [user]);

  if (alertStats.total === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {alertStats.critical > 0 && (
        <Badge variant="destructive" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {alertStats.critical} Critical Alerts
        </Badge>
      )}
      
      {alertStats.high > 0 && (
        <Badge variant="secondary" className="flex items-center gap-2 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          <AlertCircle className="h-4 w-4" />
          {alertStats.high} High Priority
        </Badge>
      )}
      
      <Badge variant="outline" className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        {alertStats.total} Total (24h)
      </Badge>
    </div>
  );
};