/**
 * In-memory transfer system for meal capture photos
 * Safe, temporary storage for handoff between modal and wizard
 */

const store = new Map<string, Blob>();

export function putMealPhoto(id: string, blob: Blob) { 
  store.set(id, blob); 
}

export function takeMealPhoto(id: string): Blob | undefined {
  const b = store.get(id);
  store.delete(id);
  return b;
}

// Cleanup function for memory safety
export function clearMealPhotos() {
  store.clear();
}