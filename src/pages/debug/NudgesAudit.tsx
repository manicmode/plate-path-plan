import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { getDailyAudit, getLastShownDates, get7DayCounts } from '@/nudges/logEvent';
import { REGISTRY } from '@/nudges/registry';

interface NudgeAuditData {
  lastShown: Record<string, Date>;
  todayCounts: Record<string, number>;
  weekCounts: Record<string, number>;
  recentEvents: any[];
  dailyAudit: any;
}

export function NudgesAudit() {
  const { user } = useAuth();
  const [auditData, setAuditData] = useState<NudgeAuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAuditData = async () => {
    if (!user?.id) return;

    try {
      setRefreshing(true);
      
      // Get last shown dates
      const lastShown = await getLastShownDates(user.id);
      
      // Get 7-day counts
      const weekCounts = await get7DayCounts(user.id);
      
      // Get today's counts
      const today = new Date().toISOString().split('T')[0];
      const { data: todayEvents } = await supabase
        .from('nudge_events')
        .select('nudge_id')
        .eq('user_id', user.id)
        .eq('event', 'shown')
        .gte('ts', today + 'T00:00:00Z')
        .lt('ts', today + 'T23:59:59Z');

      const todayCounts: Record<string, number> = {};
      todayEvents?.forEach(event => {
        todayCounts[event.nudge_id] = (todayCounts[event.nudge_id] || 0) + 1;
      });

      // Get recent events
      const { data: recentEvents } = await supabase
        .from('nudge_events')
        .select('*')
        .eq('user_id', user.id)
        .order('ts', { ascending: false })
        .limit(100);

      // Get daily audit
      const dailyAudit = await getDailyAudit(14);

      setAuditData({
        lastShown,
        todayCounts,
        weekCounts,
        recentEvents: recentEvents || [],
        dailyAudit
      });
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Please sign in to view nudge audit.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <p>Loading audit data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nudge Audit</h1>
          <p className="text-muted-foreground">Debug nudge scheduler behavior and history</p>
        </div>
        <Button 
          onClick={loadAuditData} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Today</h3>
            </div>
            <p className="text-2xl font-bold mt-2">
              {Object.values(auditData?.todayCounts || {}).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Nudges shown today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">This Week</h3>
            </div>
            <p className="text-2xl font-bold mt-2">
              {Object.values(auditData?.weekCounts || {}).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Nudges shown this week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">Active Rules</h3>
            </div>
            <p className="text-2xl font-bold mt-2">{REGISTRY.length}</p>
            <p className="text-sm text-muted-foreground">Nudge definitions</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Shown Per Nudge */}
      <Card>
        <CardHeader>
          <CardTitle>Last Shown Per Nudge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {REGISTRY.map(definition => {
              const lastShown = auditData?.lastShown[definition.id];
              const todayCount = auditData?.todayCounts[definition.id] || 0;
              const weekCount = auditData?.weekCounts[definition.id] || 0;
              
              return (
                <div key={definition.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{definition.id}</h4>
                      <Badge variant="outline">Priority: {definition.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cooldown: {definition.cooldownDays}d | Daily Cap: {definition.dailyCap} | Weekly Cap: {definition.maxPer7d}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex gap-2">
                      <Badge variant="secondary">Today: {todayCount}</Badge>
                      <Badge variant="secondary">Week: {weekCount}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lastShown ? (
                        <>Last: {formatRelativeTime(lastShown)}</>
                      ) : (
                        'Never shown'
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events (Last 100)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditData?.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-2 text-sm border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={
                      event.event === 'shown' ? 'default' : 
                      event.event === 'cta' ? 'default' : 'secondary'
                    }
                  >
                    {event.event}
                  </Badge>
                  <span className="font-medium">{event.nudge_id}</span>
                  {event.reason && (
                    <span className="text-muted-foreground">({event.reason})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(new Date(event.ts))}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Violations Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Potential Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {REGISTRY.map(definition => {
              const todayCount = auditData?.todayCounts[definition.id] || 0;
              const weekCount = auditData?.weekCounts[definition.id] || 0;
              
              const violations = [];
              if (todayCount > definition.dailyCap) {
                violations.push(`Daily cap exceeded: ${todayCount}/${definition.dailyCap}`);
              }
              if (weekCount > definition.maxPer7d) {
                violations.push(`Weekly cap exceeded: ${weekCount}/${definition.maxPer7d}`);
              }
              
              if (violations.length > 0) {
                return (
                  <div key={definition.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                    <div className="font-medium text-red-800">{definition.id}</div>
                    <div className="text-sm text-red-600 mt-1">
                      {violations.join(', ')}
                    </div>
                  </div>
                );
              }
              
              return null;
            })}
            
            {REGISTRY.every(def => {
              const todayCount = auditData?.todayCounts[def.id] || 0;
              const weekCount = auditData?.weekCounts[def.id] || 0;
              return todayCount <= def.dailyCap && weekCount <= def.maxPer7d;
            }) && (
              <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                <p className="text-green-800 text-sm">✅ All nudges within limits</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}