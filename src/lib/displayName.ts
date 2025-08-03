import { ExtendedUser } from '@/contexts/auth/types';

export function getDisplayName(user?: { first_name?: string; email?: string } | null): string {
  const DEBUG = true;
  const log = (...args: any[]) => {
    if (DEBUG) console.log('🧠 [getDisplayName]', ...args);
  };

  if (!user) {
    log('No user provided');
    return 'User';
  }

  log('Input user:', {
    first_name: user.first_name,
    email: user.email
  });

  if (user.first_name && typeof user.first_name === 'string' && user.first_name.trim() !== '') {
    const trimmed = user.first_name.trim();
    log('✅ Resolved from first_name:', trimmed);
    return trimmed;
  }

  if (user.email && typeof user.email === 'string') {
    const prefix = user.email.split('@')[0];
    log('⚠️ Fallback to email prefix:', prefix);
    return prefix || 'User';
  }

  log('❌ All fields empty, using default');
  return 'User';
}

// Get initials from display name for avatars
export function getDisplayInitials(user?: { first_name?: string; email?: string } | null): string {
  const displayName = getDisplayName(user);
  
  // Use first letter of display name or split on space if available
  const nameParts = displayName.split(' ');
  if (nameParts.length >= 2) {
    return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`;
  }
  
  return displayName.charAt(0).toUpperCase();
}