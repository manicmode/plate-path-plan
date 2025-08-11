import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthUrlHandler() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let timer: number | undefined;

    const hasHashTokens = typeof window !== 'undefined' && loc.hash.includes('access_token=');
    const searchParams = new URLSearchParams(loc.search);
    const hasCode = searchParams.has('code');

    if (!hasHashTokens && !hasCode) return;

    const hashParams = new URLSearchParams(loc.hash.replace(/^#/, ''));
    const type = hashParams.get('type') || '';

    (async () => {
      // Give supabase-js a short tick to parse the URL (detectSessionInUrl)
      await new Promise<void>((resolve) => {
        timer = window.setTimeout(() => resolve(), 50);
      });

      const { data: { session } } = await supabase.auth.getSession();

      // Clear URL so we don't reprocess on refresh
      window.history.replaceState({}, '', loc.pathname);

      if (!session) {
        // If for some reason session didn't establish, stay on current page
        return;
      }

      if (type === 'recovery') {
        nav('/reset-password', { replace: true });
        return;
      }

      // Check onboarding status quickly
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        nav('/home', { replace: true });
      } else {
        nav('/onboarding', { replace: true });
      }
    })();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loc.hash, loc.search, loc.pathname, nav]);

  return null;
}
