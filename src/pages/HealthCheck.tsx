import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FF } from '@/featureFlags';

const APP_VERSION =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_VERSION) ||
  (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_APP_VERSION) ||
  (typeof process !== "undefined" && (process as any).env?.APP_VERSION) ||
  "0.0.0";

interface HealthStatus {
  ok: boolean;
  version: string;
  arena: string;
  time: string;
  db: 'reachable' | 'error';
  hardDisabled: boolean;
}

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus>({
    ok: true,
    version: APP_VERSION,
    arena: 'v2',
    time: new Date().toISOString(),
    db: 'reachable',
    hardDisabled: false
  });

  useEffect(() => {
    // Flag logging (dev only)
    if (import.meta.env.DEV) {
      console.log('[FF]', FF);
    }
    
    const checkHealth = async () => {
      try {
        // Check DB and flag status
        await supabase.rpc('arena_get_active_group_id');
        setHealth(prev => ({ ...prev, db: 'reachable' }));
        
        // Check hard disable flag
        const { data: flagData } = await (supabase as any)
          .from('runtime_flags')
          .select('enabled')
          .eq('name', 'arena_v2_hard_disable')
          .maybeSingle();
        
        setHealth(prev => ({ ...prev, hardDisabled: flagData?.enabled ?? false }));
      } catch (error) {
        console.warn('[health] DB check failed:', error);
        setHealth(prev => ({ ...prev, db: 'error' }));
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Health Check</h1>
          <div 
            data-testid="health-status"
            className="bg-card p-6 rounded-lg border"
          >
            <pre className="text-sm text-muted-foreground text-left">
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
          <div className="mt-4 space-y-2">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              health.ok && health.db === 'reachable' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
            }`}>
              {health.ok && health.db === 'reachable' ? '✅ Healthy' : '⚠️ Degraded'}
            </div>
            <p className="text-xs text-muted-foreground">
              Arena V2 • {new Date(health.time).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}