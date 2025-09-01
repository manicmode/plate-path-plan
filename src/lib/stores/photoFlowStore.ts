/**
 * Ephemeral in-memory store for Photo Flow V2 data
 * TTL-based storage to pass normalized photo analysis results to health analyzer
 */

type Item = any; // Normalized Photo Flow V2 payload type
const map = new Map<string, { item: Item; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export function put(item: Item): string {
  const id = Math.random().toString(36).slice(2);
  map.set(id, { item, ts: Date.now() });
  console.log('[PHOTO][STORE][PUT]', { id, size: map.size });
  return id;
}

export function get(id: string): Item | null {
  const rec = map.get(id);
  if (!rec) {
    console.log('[PHOTO][STORE][GET] not found', { id });
    return null;
  }
  
  if (Date.now() - rec.ts > TTL) {
    map.delete(id);
    console.log('[PHOTO][STORE][GET] expired', { id });
    return null;
  }
  
  console.log('[PHOTO][STORE][GET] found', { id });
  return rec.item;
}

export function del(id: string) {
  const existed = map.delete(id);
  console.log('[PHOTO][STORE][DEL]', { id, existed, remaining: map.size });
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  const expired: string[] = [];
  
  for (const [id, { ts }] of map.entries()) {
    if (now - ts > TTL) {
      expired.push(id);
    }
  }
  
  expired.forEach(id => map.delete(id));
  
  if (expired.length > 0) {
    console.log('[PHOTO][STORE][CLEANUP]', { expired: expired.length, remaining: map.size });
  }
}, 60000); // Clean every minute