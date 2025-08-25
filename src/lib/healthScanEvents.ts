export function logScanEvent(kind: string, props: Record<string, any> = {}) {
  try { 
    console.log("[healthscan]", kind, props); 
  } catch {}
}