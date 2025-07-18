// Utility functions for tracking page visits and user activity

export const trackPageVisit = (pageName: string) => {
  const timestamp = Date.now();
  localStorage.setItem(`last${pageName}Visit`, timestamp.toString());
};

export const getLastPageVisit = (pageName: string): number => {
  const stored = localStorage.getItem(`last${pageName}Visit`);
  return stored ? parseInt(stored) : 0;
};

export const hasVisitedPageRecently = (pageName: string, hoursThreshold: number): boolean => {
  const lastVisit = getLastPageVisit(pageName);
  if (!lastVisit) return false;
  
  const now = Date.now();
  const hoursSinceVisit = (now - lastVisit) / (1000 * 60 * 60);
  
  return hoursSinceVisit <= hoursThreshold;
};

export const markGameChallengeInteraction = () => {
  trackPageVisit('GameChallenge');
};

export const markCoachInteraction = () => {
  trackPageVisit('Coach');
};