import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Activity, Lock, TrendingUp, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: any;
  user_id: string | null;
  severity: string;
  created_at: string;
}

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  high_events: number;
  failed_logins: number;
  suspicious_activities: number;
  unique_users_affected: number;
}

export const EnhancedSecurityDashboard = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    total_events: 0,
    critical_events: 0,
    high_events: 0,
    failed_logins: 0,
    suspicious_activities: 0,
    unique_users_affected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      
      // Calculate time filter
      const timeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };
      const hoursBack = timeMap[timeFilter as keyof typeof timeMap] || 24;
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // Build query
      let query = supabase
        .from('security_events')
        .select('*')
        .gte('created_at', cutoffTime);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (searchTerm) {
        query = query.or(`event_type.ilike.%${searchTerm}%,event_details->>message.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(data || []);
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error fetching security events:', error);
      toast.error('Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (eventData: SecurityEvent[]): SecurityMetrics => {
    const total_events = eventData.length;
    const critical_events = eventData.filter(e => e.severity === 'critical').length;
    const high_events = eventData.filter(e => e.severity === 'high').length;
    const failed_logins = eventData.filter(e => e.event_type === 'login_failure').length;
    const suspicious_activities = eventData.filter(e => 
      e.event_type.includes('suspicious') || 
      e.event_type.includes('injection') || 
      e.event_type.includes('xss')
    ).length;
    const unique_users_affected = new Set(eventData.map(e => e.user_id).filter(Boolean)).size;

    return {
      total_events,
      critical_events,
      high_events,
      failed_logins,
      suspicious_activities,
      unique_users_affected,
    };
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, [timeFilter, severityFilter, searchTerm]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchSecurityEvents, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeFilter, severityFilter, searchTerm]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze security events across your application</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary/10' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />

        <Button onClick={fetchSecurityEvents} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">{metrics.total_events}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-2xl font-bold">{metrics.critical_events}</div>
            </div>
            <p className="text-xs text-muted-foreground">Critical Events</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div className="text-2xl font-bold">{metrics.high_events}</div>
            </div>
            <p className="text-xs text-muted-foreground">High Severity</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-yellow-600" />
              <div className="text-2xl font-bold">{metrics.failed_logins}</div>
            </div>
            <p className="text-xs text-muted-foreground">Failed Logins</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold">{metrics.suspicious_activities}</div>
            </div>
            <p className="text-xs text-muted-foreground">Suspicious Activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">{metrics.unique_users_affected}</div>
            </div>
            <p className="text-xs text-muted-foreground">Users Affected</p>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>
            Recent security events matching your filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Activity className="h-8 w-8 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No security events found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{event.event_type}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {event.user_id && (
                    <div className="text-sm">
                      <span className="font-medium">User:</span> {event.user_id}
                    </div>
                  )}
                  
                  {event.event_details && (
                    <div className="text-sm">
                      <span className="font-medium">Details:</span>{' '}
                      <code className="bg-muted px-1 rounded text-xs">
                        {JSON.stringify(event.event_details, null, 2)}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};