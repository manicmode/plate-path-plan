/**
 * Pipeline Isolation Feature Flags
 * All flags default to OFF for dark-ship deployment
 */
export const FF = {
  PIPELINE_ISOLATION: (import.meta.env.VITE_PIPELINE_ISOLATION ?? 'false') === 'true', // master kill
  PHOTO_ISOLATED: (import.meta.env.VITE_PHOTO_ISOLATED ?? 'false') === 'true',
  BARCODE_ISOLATED: (import.meta.env.VITE_BARCODE_ISOLATED ?? 'false') === 'true',
  VOICE_ISOLATED: (import.meta.env.VITE_VOICE_ISOLATED ?? 'false') === 'true',
  MANUAL_ISOLATED: (import.meta.env.VITE_MANUAL_ISOLATED ?? 'false') === 'true',
} as const;