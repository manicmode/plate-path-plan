export const isIOSWebKit =
  /AppleWebKit/.test(navigator.userAgent) &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || ('ontouchend' in document));

export function scannerLiveCamEnabled() {
  const ff = (window as any).__featureFlags || {};
  // Default OFF on iOS; can be flipped at runtime for testing
  if (isIOSWebKit) return !!ff.IOS_LIVE_SCANNER_CAM;
  return true;
}