// Centralized display name helper function
export function getDisplayName(user: {
  first_name?: string;
  username?: string;
  nickname?: string;
  email?: string;
}): string {
  console.log('[DEBUG] getDisplayName called with:', {
    first_name: user?.first_name,
    username: user?.username,
    email: user?.email ? user.email.split('@')[0] + '@...' : undefined
  });
  
  // PRIORITY 1: first_name
  if (user?.first_name && user.first_name.trim() && user.first_name.trim() !== 'User') {
    console.log('[DEBUG] getDisplayName: Using first_name:', user.first_name.trim());
    return user.first_name.trim();
  }
  
  // PRIORITY 2: username
  if (user?.username && user.username.trim() && user.username.trim() !== 'User') {
    console.log('[DEBUG] getDisplayName: Using username:', user.username.trim());
    return user.username.trim();
  }
  
  // PRIORITY 3: nickname (fallback for processed names)
  if (user?.nickname && user.nickname.trim() && user.nickname.trim() !== 'User') {
    console.log('[DEBUG] getDisplayName: Using nickname:', user.nickname.trim());
    return user.nickname.trim();
  }
  
  // Phase 3: Defensive fallback - never show full email, use "Profile Name" placeholder
  if (user?.email) {
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix && emailPrefix !== 'user' && emailPrefix !== 'test') {
      console.log('[DEBUG] getDisplayName: Using email prefix:', emailPrefix);
      return emailPrefix;
    }
  }
  
  // FINAL FALLBACK: Placeholder instead of 'User'
  console.log('[DEBUG] getDisplayName: Using fallback placeholder');
  return 'Profile Name';
}

// Get initials from display name for avatars
export function getDisplayInitials(user: {
  first_name?: string;
  username?: string;
  nickname?: string;
  email?: string;
}): string {
  const displayName = getDisplayName(user);
  
  // Use first letter of display name or split on space if available
  const nameParts = displayName.split(' ');
  if (nameParts.length >= 2) {
    return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`;
  }
  
  return displayName.charAt(0).toUpperCase();
}
