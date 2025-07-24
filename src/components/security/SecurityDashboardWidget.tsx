import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  lastEventTime?: string;
  topThreats: Array<{ type: string; count: number }>;
}

export const SecurityDashboardWidget: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    topThreats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSecurityMetrics = async () => {
      if (!user) return;

      try {
        // Get security events from last 24 hours
        const { data: events, error } = await supabase
          .from('security_events')
          .select('event_type, severity, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        const criticalEvents = events.filter(e => e.severity === 'critical').length;
        const highEvents = events.filter(e => e.severity === 'high').length;
        
        // Count threat types
        const threatCounts = events.reduce((acc: Record<string, number>, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {});

        const topThreats = Object.entries(threatCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => ({ type, count }));

        setMetrics({
          totalEvents: events.length,
          criticalEvents,
          highEvents,
          lastEventTime: events[0]?.created_at,
          topThreats
        });
      } catch (error) {
        console.warn('Failed to load security metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSecurityMetrics();

    // Refresh metrics every 5 minutes
    const interval = setInterval(loadSecurityMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const getSecurityStatus = () => {
    if (metrics.criticalEvents > 0) return { color: 'destructive', status: 'Critical' };
    if (metrics.highEvents > 5) return { color: 'secondary', status: 'Warning' };
    if (metrics.totalEvents > 50) return { color: 'outline', status: 'Active' };
    return { color: 'default', status: 'Secure' };
  };

  const securityStatus = getSecurityStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </div>
          <Badge variant={securityStatus.color as any}>
            {securityStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{metrics.totalEvents}</div>
            <div className="text-sm text-muted-foreground">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{metrics.criticalEvents}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.highEvents}</div>
            <div className="text-sm text-muted-foreground">High Risk</div>
          </div>
        </div>

        {metrics.topThreats.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Threats (24h)
            </h4>
            <div className="space-y-1">
              {metrics.topThreats.slice(0, 3).map(({ type, count }) => (
                <div key={type} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground truncate">{type.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.lastEventTime && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Last event: {new Date(metrics.lastEventTime).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};