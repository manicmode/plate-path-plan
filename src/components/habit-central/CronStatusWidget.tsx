import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CronStatusData {
  lastRun: {
    ran_at: string;
    status_code: number;
    ok: boolean;
    ms: number;
    note: string;
  } | null;
  failures24h: number;
  successPct7d: number;
}

export function CronStatusWidget() {
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
      // Get last run
      const { data: lastRunData } = await supabase
        .from('cron_nudge_logs')
        .select('ran_at, status_code, ok, ms, note')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get failures in last 24h
      const { count: failures24h } = await supabase
        .from('cron_nudge_logs')
        .select('*', { count: 'exact', head: true })
        .gte('ran_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('ok', false);

      // Get success rate last 7d
      const { data: successData } = await supabase
        .from('cron_nudge_logs')
        .select('ok')
        .gte('ran_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      let successPct7d = 0;
      if (successData && successData.length > 0) {
        const successCount = successData.filter(row => row.ok).length;
        successPct7d = Math.round((successCount / successData.length) * 100);
      }

      setCronData({
        lastRun: lastRunData,
        failures24h: failures24h || 0,
        successPct7d
      });
    } catch (error) {
      console.error('Error loading cron status:', error);
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
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Cron Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (!cronData?.lastRun) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Cron Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No runs logged yet.
        </CardContent>
      </Card>
    );
  }

  const { lastRun, failures24h, successPct7d } = cronData;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Cron Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Last run:</span>
            <span>{formatTimeAgo(lastRun.ran_at)}</span>
            {lastRun.ok ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
            <Badge variant="outline" className="text-xs">
              {lastRun.status_code}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({lastRun.ms}ms)
            </span>
          </div>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">24h failures:</span>
          <Badge variant={failures24h > 0 ? "destructive" : "outline"} className="text-xs">
            {failures24h}
          </Badge>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">7d success:</span>
          <Badge 
            variant={successPct7d >= 95 ? "default" : successPct7d >= 80 ? "secondary" : "destructive"} 
            className="text-xs"
          >
            {successPct7d}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}