export async function preloadHome() {
  try {
    // adjust path if your alias differs
    await import('@/pages/Home');
    
    return true;
  } catch (e) {
    
    return false;
  }
}