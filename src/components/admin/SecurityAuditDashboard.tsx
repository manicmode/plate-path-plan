import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertTriangle, Shield, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface SecurityEvent {
  id: string;
  user_id?: string;
  event_type: string;
  event_details: any;
  ip_address?: unknown;
  user_agent?: string;
  severity: string;
  created_at: string;
}

const SecurityAuditDashboard: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0
  });

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setEvents(data || []);
      
      // Calculate statistics
      const stats = (data || []).reduce((acc, event) => {
        acc.totalEvents++;
        acc[`${event.severity}Events`] = (acc[`${event.severity}Events`] || 0) + 1;
        return acc;
      }, {
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        lowEvents: 0
      });

      setStats(stats);
    } catch (error: any) {
      console.error('Error fetching security events:', error);
      toast.error('Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Shield className="h-4 w-4" />;
      case 'low': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatEventDetails = (details: any) => {
    if (!details || typeof details !== 'object') return '';
    
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  const criticalEvents = events.filter(e => e.severity === 'critical');
  const recentHighSeverityEvents = events.filter(e => 
    ['critical', 'high'].includes(e.severity) && 
    new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Security Audit Dashboard</h1>
        <Button onClick={fetchSecurityEvents} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {criticalEvents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalEvents.length} critical security event(s) detected. Immediate attention required.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.highEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.mediumEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.lowEvents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Events Tables */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="recent">Recent High Priority</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div>Loading events...</div>
                ) : events.length === 0 ? (
                  <div>No security events found.</div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(event.severity)}
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
                          <span className="font-medium">User ID:</span> {event.user_id}
                        </div>
                      )}
                      
                      {event.ip_address && (
                        <div className="text-sm">
                          <span className="font-medium">IP Address:</span> {String(event.ip_address)}
                        </div>
                      )}
                      
                      {event.event_details && Object.keys(event.event_details).length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Details:</span> {formatEventDetails(event.event_details)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalEvents.length === 0 ? (
                  <div>No critical security events found.</div>
                ) : (
                  criticalEvents.map((event) => (
                    <div key={event.id} className="border-red-200 border rounded-lg p-4 space-y-2 bg-red-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <Badge className="bg-red-500">CRITICAL</Badge>
                          <span className="font-medium">{event.event_type}</span>
                        </div>
                        <span className="text-sm text-red-600">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">Details:</span> {formatEventDetails(event.event_details)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent High Priority Events (Last 24 Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentHighSeverityEvents.length === 0 ? (
                  <div>No recent high priority security events found.</div>
                ) : (
                  recentHighSeverityEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(event.severity)}
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{event.event_type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">Details:</span> {formatEventDetails(event.event_details)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityAuditDashboard;