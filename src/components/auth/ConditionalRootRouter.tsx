import { useLocation } from 'react-router-dom';
import { SupabaseRedirectPage } from './SupabaseRedirectPage';
import Index from '@/pages/Index';

export const ConditionalRootRouter = () => {
  const location = useLocation();
  
  // Parse URL parameters synchronously
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type');
  
  // If Supabase redirect parameters are present, handle immediately
  if (type === 'signup' || type === 'recovery') {
    console.log('🔄 Supabase redirect detected, rendering SupabaseRedirectPage');
    return <SupabaseRedirectPage />;
  }
  
  // Otherwise, render normal auth page
  console.log('📝 Normal root route, rendering Index');
  return <Index />;
};
