export async function preloadHome() {
  try {
    // adjust path if your alias differs
    await import('@/pages/Home');
    console.info('[PRELOAD] Home chunk loaded');
    return true;
  } catch (e) {
    console.error('[PRELOAD] Home chunk failed', e);
    return false;
  }
}