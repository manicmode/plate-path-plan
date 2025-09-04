import { supabase } from '@/integrations/supabase/client';

/**
 * Check if QA tools are enabled for current user
 * Returns true if:
 * - User is authenticated AND
 * - feature_flags.qa_routes_enabled = true AND
 * - User has admin role
 */
export async function isQaEnabled(): Promise<boolean> {
  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check feature flag
    const { data: flagData, error: flagError } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('key', 'qa_routes_enabled')
      .single();

    if (flagError || !flagData?.enabled) {
      return false;
    }

    // Check admin role
    const { data: hasAdminRole, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError) {
      console.warn('Failed to check admin role:', roleError);
      return false;
    }

    return hasAdminRole === true;
  } catch (error) {
    console.warn('QA access check failed:', error);
    return false;
  }
}

/**
 * Synchronous check for QA enablement (cached result)
 * Use this for immediate checks, but prefer isQaEnabled() for accurate results
 */
export function isQaEnabledCached(): boolean {
  // This will be set by the async check and stored in sessionStorage
  const cached = sessionStorage.getItem('qa_enabled');
  return cached === 'true';
}

/**
 * Initialize QA access check and cache result
 */
export async function initQaAccess(): Promise<boolean> {
  const enabled = await isQaEnabled();
  sessionStorage.setItem('qa_enabled', String(enabled));
  return enabled;
}