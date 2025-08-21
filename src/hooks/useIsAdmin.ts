import { useAdminRole } from '@/hooks/useAdminRole';

/**
 * Legacy alias for useAdminRole hook
 * @deprecated Use useAdminRole instead
 */
export function useIsAdmin() {
  return useAdminRole();
}