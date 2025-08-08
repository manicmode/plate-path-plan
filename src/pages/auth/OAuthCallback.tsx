import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { provider } = useParams();
  const [sp] = useSearchParams();
  const { toast } = useToast();

  React.useEffect(() => {
    const code = sp.get('code');
    if (!provider || !code) {
      toast({ title: 'OAuth error', description: 'Missing provider or code', variant: 'destructive' });
      navigate('/settings/connected-apps');
      return;
    }
    (async () => {
      try {
        const redirectUri = window.location.origin + `/auth/callback/${provider}`;
        const { data, error } = await supabase.functions.invoke('oauth-exchange-token', {
          body: { provider, code, redirectUri },
        });
        if (error) throw error;
        if ((data as any)?.ok) {
          toast({ title: 'Connected', description: `${provider} connected • Last synced: just now` });
        } else {
          toast({ title: 'Connected', description: `${provider} connected.` });
        }
      } catch (e: any) {
        toast({ title: 'OAuth failed', description: e.message || 'Please try again', variant: 'destructive' });
      } finally {
        navigate('/settings/connected-apps');
      }
    })();
  }, [provider, sp, navigate, toast]);

  return (
    <div className="p-6 text-center text-muted-foreground">Completing connection…</div>
  );
};

export default OAuthCallback;