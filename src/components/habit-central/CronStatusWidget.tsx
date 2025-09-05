import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type CronRow = { 
  ran_at: string; 
  status_code: number | null; 
  ok: boolean | null; 
  ms: number | null; 
  note: string | null; 
};

interface CronStatusData {
  lastRun: CronRow | null;
  failures24h: number;
  successPct7d: number;
}

const CronStatusWidget: React.FC = () => {
  const [cronData, setCronData] = useState<CronStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCronStatus();
    // Refresh every 30 seconds
    const interval = setInterval(loadCronStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCronStatus = async () => {
    try {
      // Get last run with permissive table cast
      const { data: lastRunData, error: lastRunError } = await supabase
        .from('cron_nudge_logs' as any)
        .select('ran_at, status_code, ok, ms, note')
        .order('ran_at', { ascending: false })
        .limit(1);

      // Check if table doesn't exist
      if (lastRunError && (lastRunError.code === '42P01' || /cron_nudge_logs/i.test(lastRunError.message))) {
        setCronData({ lastRun: null, failures24h: 0, successPct7d: 0 });
        setLoading(false);
        return;
      }

      const lastRun: CronRow | null = (lastRunData as any)?.[0] || null;

      // Get failures in last 24h
      const { count: failures24h, error: failures24hError } = await supabase
        .from('cron_nudge_logs' as any)
        .select('id', { count: 'exact' })
        .gte('ran_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('ok', false)
        .limit(1);

      // Get success rate last 7d
      const { data: successData, error: successError } = await supabase
        .from('cron_nudge_logs' as any)
        .select('ok')
        .gte('ran_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      let successPct7d = 0;
      if (successData && successData.length > 0) {
        const successCount = successData.filter((row: any) => row?.ok === true).length;
        successPct7d = Math.round((successCount / successData.length) * 100);
      }

      setCronData({
        lastRun,
        failures24h: failures24h || 0,
        successPct7d
      });
    } catch (error) {
      console.error('Error loading cron status:', error);
      setCronData({ lastRun: null, failures24h: 0, successPct7d: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cron Status</CardTitle>
        </CardHeader>
        <CardContent>
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (!cronData?.lastRun) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cron Status</CardTitle>
        </CardHeader>
        <CardContent>
          No runs logged yet.
        </CardContent>
      </Card>
    );
  }

  const { lastRun, failures24h, successPct7d } = cronData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Cron Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Last run: {formatTimeAgo(lastRun.ran_at)} — 
              <Badge variant={lastRun.ok ? "default" : "destructive"} className="ml-2">
                {lastRun.ok ? "✅" : "❌"}
              </Badge>
              ({lastRun.ms || 0}ms)
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">24h failures:</span>
          <Badge variant={failures24h > 0 ? "destructive" : "default"}>
            {failures24h}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">7d success:</span>
          <Badge variant={successPct7d >= 90 ? "default" : successPct7d >= 75 ? "secondary" : "destructive"}>
            {successPct7d}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default CronStatusWidget;