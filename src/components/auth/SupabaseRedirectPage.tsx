import { useSearchParams } from 'react-router-dom';
import { SupabaseRedirectHandler } from './SupabaseRedirectHandler';
import Index from '@/pages/Index';

export const SupabaseRedirectPage = () => {
  const [searchParams] = useSearchParams();
  
  const type = searchParams.get('type');
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  
  // Check if this is a Supabase redirect URL
  const isSupabaseRedirect = type && 
    ['signup', 'recovery'].includes(type) && 
    accessToken && 
    refreshToken;
  
  console.log('🔍 Route check:', {
    type,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    isSupabaseRedirect
  });
  
  // If Supabase redirect parameters are present, show the redirect handler
  if (isSupabaseRedirect) {
    return <SupabaseRedirectHandler />;
  }
  
  // Otherwise, show the normal auth page
  return <Index />;
};
