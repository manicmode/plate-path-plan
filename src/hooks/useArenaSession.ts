import { supabase } from '@/integrations/supabase/client';

/**
 * Session guard utility for Arena operations
 * Ensures authenticated session before RPC calls
 */
export async function withArenaSession<T>(fn: (uid: string) => Promise<T>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }
  return fn(session.user.id);
}

/**
 * Hook for ensuring Arena session is valid
 */
export function useArenaSession() {
  return { withArenaSession };
}