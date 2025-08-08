// Utilities to build provider OAuth authorize URLs
// Client IDs are public; values are fetched from edge function oauth-config

import { supabase } from '@/integrations/supabase/client';

export type ProviderKey = 'fitbit' | 'strava';

export interface ProviderConfig {
  fitbit: { configured: boolean; clientId: string | null; redirectUri: string | null };
  strava: { configured: boolean; clientId: string | null; redirectUri: string | null };
}

export async function fetchOAuthConfig(): Promise<ProviderConfig> {
  const { data, error } = await supabase.functions.invoke('oauth-config');
  if (error) throw error;
  return data as ProviderConfig;
}

export function buildFitbitAuthUrl(clientId: string, redirectUri: string, state: string) {
  const scopes = encodeURIComponent('activity heartrate profile');
  const redirect = encodeURIComponent(redirectUri);
  return `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirect}&scope=${scopes}&expires_in=604800&state=${encodeURIComponent(state)}`;
}

export function buildStravaAuthUrl(clientId: string, redirectUri: string, state: string) {
  const redirect = encodeURIComponent(redirectUri);
  const scope = encodeURIComponent('read');
  return `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${redirect}&approval_prompt=auto&scope=${scope}&state=${encodeURIComponent(state)}`;
}

export function getAuthorizeUrl(provider: ProviderKey, cfg: ProviderConfig, defaultRedirect?: string) {
  const state = Math.random().toString(36).slice(2);
  if (provider === 'fitbit') {
    if (!cfg.fitbit.clientId || !(cfg.fitbit.redirectUri || defaultRedirect)) return null;
    return buildFitbitAuthUrl(cfg.fitbit.clientId, (cfg.fitbit.redirectUri || defaultRedirect)!, state);
  }
  if (provider === 'strava') {
    if (!cfg.strava.clientId || !(cfg.strava.redirectUri || defaultRedirect)) return null;
    return buildStravaAuthUrl(cfg.strava.clientId, (cfg.strava.redirectUri || defaultRedirect)!, state);
  }
  return null;
}
