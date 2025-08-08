import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, PlugZap, RefreshCw, Unplug, Watch, Apple, Activity, Footprints } from 'lucide-react';
import { featureFlags } from '@/config/features';
import { Link } from 'react-router-dom';

const providers: { key: 'fitbit' | 'healthkit' | 'googlefit' | 'strava'; name: string; icon: React.ReactNode }[] = [
  { key: 'fitbit', name: 'Fitbit', icon: <Activity className="h-5 w-5" /> },
  { key: 'healthkit', name: 'Apple Health (HealthKit)', icon: <Apple className="h-5 w-5" /> },
  { key: 'googlefit', name: 'Google Fit', icon: <Watch className="h-5 w-5" /> },
  { key: 'strava', name: 'Strava', icon: <Footprints className="h-5 w-5" /> },
];

const useProviderStatus = (userId?: string | null) => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const refresh = () => setRefreshIndex((i) => i + 1);

  const data = useMemo(() => ({ refreshIndex }), [refreshIndex]);
  return { loadingKey, setLoadingKey, refresh, data };
};

const ConnectedApps: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { loadingKey, setLoadingKey, refresh } = useProviderStatus(user?.id);

  const handleSync = async (provider: 'fitbit' | 'strava' | 'healthkit' | 'googlefit') => {
    try {
      setLoadingKey(provider);
      const { data, error } = await supabase.functions.invoke('steps-sync', {
        body: { provider, backfillDays: 7 },
        headers: { 'x-client-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      if (error) throw error;
      const imported = (data as any)?.importedDays ?? 0;
      toast({ title: 'Sync complete', description: `Imported ${imported} day(s) from ${provider}.` });
      refresh();
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      setLoadingKey(provider);
      const { error } = await supabase
        .from('oauth_tokens')
        .delete()
        .eq('user_id', user?.id)
        .eq('provider', provider);
      if (error) throw error;
      toast({ title: 'Disconnected', description: `${provider} disconnected.` });
      refresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoadingKey(null);
    }
  };

  const getConnectionStatus = async (provider: string) => {
    const [{ data: token }, { data: latest }] = await Promise.all([
      supabase
        .from('oauth_tokens')
        .select('updated_at')
        .eq('user_id', user?.id)
        .eq('provider', provider)
        .maybeSingle(),
      supabase
        .from('activity_steps')
        .select('date')
        .eq('user_id', user?.id)
        .eq('source', provider)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      connected: !!token,
      lastSync: latest?.date || token?.updated_at || null,
    } as { connected: boolean; lastSync: string | null };
  };

  return (
    <main className="container mx-auto p-4 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Connected Apps</h1>
        <p className="text-sm text-muted-foreground">Securely connect your activity providers. We never log your tokens.</p>
      </header>

      <section className="space-y-4">
        {providers.map((p) => {
          const comingSoon = (p.key === 'healthkit' && !featureFlags.steps.healthkit.enabled) || (p.key === 'googlefit' && !featureFlags.steps.googlefit.enabled);
          return (
            <Card key={p.key} className="border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">{p.icon}</div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <ProviderStatusInline userId={user?.id} provider={p.key} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {comingSoon ? (
                    <span className="text-xs text-muted-foreground">Coming soon on native</span>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleSync(p.key)} disabled={loadingKey === p.key}>
                        {loadingKey === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Sync Now</span>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDisconnect(p.key)} disabled={loadingKey === p.key}>
                        <Unplug className="h-4 w-4" />
                        <span className="ml-2">Disconnect</span>
                      </Button>
                      <Button variant="default" size="sm" onClick={() => toast({ title: 'Connect', description: p.key === 'strava' ? 'Strava may not return steps; Fitbit recommended.' : 'OAuth setup required.' })}>
                        <PlugZap className="h-4 w-4" />
                        <span className="ml-2">Connect</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <footer className="mt-8 text-sm text-muted-foreground">
        Trouble syncing? Try manual steps in Home → Log Workout → Add Steps. Or <Link className="underline" to="/analytics">view analytics</Link>.
      </footer>
    </main>
  );
};

const ProviderStatusInline: React.FC<{ userId?: string | null; provider: string }> = ({ userId, provider }) => {
  const [status, setStatus] = React.useState<{ connected: boolean; lastSync: string | null } | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: token }, { data: latest }] = await Promise.all([
        supabase
          .from('oauth_tokens')
          .select('updated_at')
          .eq('user_id', userId)
          .eq('provider', provider)
          .maybeSingle(),
        supabase
          .from('activity_steps')
          .select('date')
          .eq('user_id', userId)
          .eq('source', provider)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      setStatus({ connected: !!token, lastSync: latest?.date || token?.updated_at || null });
    })();
    return () => {
      active = false;
    };
  }, [userId, provider]);

  if (!status) return <div className="text-xs text-muted-foreground">Loading…</div>;
  return (
    <div className="text-xs text-muted-foreground">
      {status.connected ? 'Connected' : 'Not Connected'}
      {status.lastSync ? ` • Last sync: ${new Date(status.lastSync).toLocaleDateString()}` : ''}
      {provider === 'strava' && (
        <div className="mt-1 text-[11px] text-muted-foreground">Strava may not provide step counts; Fitbit recommended for steps.</div>
      )}
    </div>
  );
};

export default ConnectedApps;
