export interface ShareableRoutine {
  id: string;
  name: string;
  goal: string;
  splitType: string;
  daysPerWeek: number;
  duration: number;
}

export const generateShareableLink = (routine: ShareableRoutine): string => {
  const baseUrl = window.location.origin;
  const routineParams = new URLSearchParams({
    id: routine.id,
    name: routine.name,
    goal: routine.goal,
    split: routine.splitType,
    days: routine.daysPerWeek.toString(),
    duration: routine.duration.toString(),
  });
  
  return `${baseUrl}/shared-routine?${routineParams.toString()}`;
};

export const shareRoutine = async (routine: ShareableRoutine): Promise<boolean> => {
  const shareUrl = generateShareableLink(routine);
  const shareData = {
    title: `Check out my workout routine: ${routine.name}`,
    text: `I found this amazing ${routine.goal} routine - ${routine.daysPerWeek} days/week! 💪`,
    url: shareUrl,
  };

  try {
    // Check if native sharing is available (mobile)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      return false; // Indicates fallback was used
    }
  } catch (error) {
    console.error('Error sharing routine:', error);
    // Final fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      return false;
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError);
      throw new Error('Unable to share routine');
    }
  }
};

export const getAppStoreRedirectUrl = (): string => {
  // This would be your actual App Store URL
  return 'https://apps.apple.com/app/your-app-id';
};