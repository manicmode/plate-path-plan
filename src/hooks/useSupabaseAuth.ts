import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseAuth() {
  const [session, setSession] = React.useState<any>(null);
  const [user, setUser] = React.useState<any>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setReady(true);
      console.log('[AUTH] initial session', { hasSession: !!data.session, userId: data.session?.user?.id });
      // Forensic: Auth ready state
      if (import.meta.env.DEV) {
        console.log('[auth] ready?', { ready: true, user: !!data.session?.user });
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      console.log('[AUTH] state change', { hasSession: !!s, userId: s?.user?.id });
    });

    return () => { mounted = false; sub?.subscription.unsubscribe(); };
  }, []);

  return { session, user, ready };
}