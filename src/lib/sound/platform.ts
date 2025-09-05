export const isIOS = () =>
  /iP(hone|od|ad)/.test(navigator.platform) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document); // iPadOS

export const isStandalonePWA = () => 
  (window.matchMedia?.('(display-mode: standalone)').matches) || 
  (navigator as any).standalone === true;