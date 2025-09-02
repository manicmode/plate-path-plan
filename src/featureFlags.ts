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
  PHOTO_SANDBOX_ALLOW_PROD: (import.meta.env.VITE_PHOTO_SANDBOX_ALLOW_PROD ?? 'false') === 'true',
  OCR_HEALTH_REPORT_ENABLED: (import.meta.env.VITE_OCR_HEALTH_REPORT_ENABLED ?? 'true') === 'true',
  FEATURE_HEALTH_SCAN_PHOTO: true, // Enable Take a Photo tile in Health Scan
  FEATURE_HEALTH_REPORT_V1: true, // Enable Health Report V1
  FEATURE_LYF_ENSEMBLE: false, // Pin LYF to frozen v1 only - no GPT/ensemble paths
  FEATURE_LYF_LOG_THIS_SET: true, // Enable one-tap logging
  FEATURE_NUMBER_WHEEL_PICKERS: true, // Enable roller number pickers with haptics
  FEATURE_LYF_V1_DEBUG: import.meta.env.DEV, // Dev debug mode for LYF v1
  FEATURE_ONE_TAP_LOG: true, // One-tap logging functionality
  FEATURE_USE_GPT_FIRST: (import.meta.env.VITE_FEATURE_USE_GPT_FIRST ?? 'false') === 'true', // GPT-first detection with Vision fallback
  FEATURE_USE_GPT_ONLY: (import.meta.env.VITE_FEATURE_USE_GPT_ONLY ?? 'false') === 'true' // GPT-only detection (no Vision fallback)
} as const;