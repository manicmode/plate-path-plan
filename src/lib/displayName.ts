// Phase 3: Enhanced centralized display name helper function
export function getDisplayName(user: {
  first_name?: string;
  username?: string;
  nickname?: string;
  email?: string;
}): string {
  console.log('[DEBUG] getDisplayName called with:', {
    first_name: user?.first_name,
    username: user?.username,
    email: user?.email ? user.email.split('@')[0] + '@...' : undefined,
    hasValidFirstName: !!(user?.first_name && user.first_name.trim() && user.first_name.trim() !== 'User'),
    // ✅ Log clearly if first_name is null or missing
    first_name_status: user?.first_name ? 'present' : 'null_or_missing'
  });
  
  // ✅ Enhanced logging for first_name check
  if (!user?.first_name) {
    console.log('[DEBUG] getDisplayName: ❌ first_name is null/missing, will use fallback');
  } else if (!user.first_name.trim()) {
    console.log('[DEBUG] getDisplayName: ❌ first_name is empty string, will use fallback');
  } else if (user.first_name.trim() === 'User') {
    console.log('[DEBUG] getDisplayName: ❌ first_name is default "User", will use fallback');
  }
  
  // PRIORITY 1: first_name (enhanced validation)
  if (user?.first_name && user.first_name.trim() && user.first_name.trim() !== 'User' && user.first_name.trim() !== '') {
    const trimmedName = user.first_name.trim();
    console.log('[DEBUG] getDisplayName: ✅ Using first_name:', trimmedName);
    return trimmedName;
  }
  
  // PRIORITY 2: username (no last_name usage anywhere)
  if (user?.username && user.username.trim() && user.username.trim() !== 'User' && user.username.trim() !== '') {
    const trimmedUsername = user.username.trim();
    console.log('[DEBUG] getDisplayName: Using username:', trimmedUsername);
    return trimmedUsername;
  }
  
  // PRIORITY 3: nickname (fallback for processed names)
  if (user?.nickname && user.nickname.trim() && user.nickname.trim() !== 'User' && user.nickname.trim() !== '') {
    const trimmedNickname = user.nickname.trim();
    console.log('[DEBUG] getDisplayName: Using nickname:', trimmedNickname);
    return trimmedNickname;
  }
  
  // PRIORITY 4: Email prefix (never show full email)
  if (user?.email) {
    const emailPrefix = user.email.split('@')[0];
    if (emailPrefix && emailPrefix !== 'user' && emailPrefix !== 'test' && emailPrefix.length > 0) {
      console.log('[DEBUG] getDisplayName: Using email prefix:', emailPrefix);
      return emailPrefix;
    }
  }
  
  // FINAL FALLBACK: Professional placeholder - never show full email
  console.log('[DEBUG] getDisplayName: ⚠️ Using fallback placeholder - no valid display name found');
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
