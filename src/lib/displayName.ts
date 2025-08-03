// Centralized display name helper function
export function getDisplayName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  nickname?: string;
  email?: string;
}): string {
  // PRIORITY 1: first_name + last_name combination
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  if (fullName && fullName !== '' && !fullName.includes('undefined') && !fullName.includes('null')) {
    return fullName;
  }
  
  // PRIORITY 2: username
  if (user?.username && user.username.trim() && user.username.trim() !== 'User') {
    return user.username.trim();
  }
  
  // PRIORITY 3: nickname (fallback for processed names)
  if (user?.nickname && user.nickname.trim() && user.nickname.trim() !== 'User') {
    return user.nickname.trim();
  }
  
  // PRIORITY 4: email prefix (before @)
  if (user?.email) {
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix) {
      return emailPrefix;
    }
  }
  
  // FINAL FALLBACK: 'User'
  return 'User';
}

// Get initials from display name for avatars
export function getDisplayInitials(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  nickname?: string;
  email?: string;
}): string {
  const displayName = getDisplayName(user);
  
  // If we have first_name and last_name, use first letter of each
  if (user?.first_name && user?.last_name) {
    return `${user.first_name.charAt(0).toUpperCase()}${user.last_name.charAt(0).toUpperCase()}`;
  }
  
  // Otherwise, use first letter of display name or split on space if available
  const nameParts = displayName.split(' ');
  if (nameParts.length >= 2) {
    return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`;
  }
  
  return displayName.charAt(0).toUpperCase();
}
