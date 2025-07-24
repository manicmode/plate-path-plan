import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAlert {
  id: string;
  function_name: string;
  event_type: string;
  ip_address: string;
  created_at: string;
  details?: string;
}

interface SecurityStats {
  total_events: number;
  unauthorized_attempts: number;
  invalid_tokens: number;
  success_rate: number;
}

export const SecurityMonitoringDashboard = () => {
  const [recentAlerts, setRecentAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      // Get recent security events
      const { data: alerts } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get security statistics for the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: allEvents } = await supabase
        .from('security_logs')
        .select('event_type')
        .gte('created_at', twentyFourHoursAgo);

      if (allEvents) {
        const totalEvents = allEvents.length;
        const unauthorizedAttempts = allEvents.filter(e => e.event_type === 'unauthorized').length;
        const invalidTokens = allEvents.filter(e => e.event_type === 'invalid_token').length;
        const successEvents = allEvents.filter(e => e.event_type === 'success').length;
        const successRate = totalEvents > 0 ? (successEvents / totalEvents) * 100 : 100;

        setStats({
          total_events: totalEvents,
          unauthorized_attempts: unauthorizedAttempts,
          invalid_tokens: invalidTokens,
          success_rate: successRate
        });
      }

      setRecentAlerts(alerts || []);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'success':
        return 'bg-green-500';
      case 'unauthorized':
        return 'bg-red-500';
      case 'invalid_token':
        return 'bg-orange-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'unauthorized':
      case 'invalid_token':
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events (24h)</p>
                <p className="text-2xl font-bold">{stats?.total_events || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.success_rate?.toFixed(1) || 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unauthorized</p>
                <p className="text-2xl font-bold text-red-600">{stats?.unauthorized_attempts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invalid Tokens</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.invalid_tokens || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent security events</p>
            ) : (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getEventIcon(alert.event_type)}
                    <div>
                      <p className="font-medium">{alert.function_name}</p>
                      <p className="text-sm text-muted-foreground">
                        IP: {alert.ip_address}
                        {alert.details && ` • ${alert.details}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getEventBadgeColor(alert.event_type)} text-white`}>
                      {alert.event_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};