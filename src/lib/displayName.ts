// Centralized display name helper function
export function getDisplayName(user: {
  first_name?: string;
  username?: string;
  nickname?: string;
  email?: string;
}): string {
  // PRIORITY 1: first_name
  if (user?.first_name && user.first_name.trim() && user.first_name.trim() !== 'User') {
    return user.first_name.trim();
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
