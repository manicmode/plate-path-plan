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
  FEATURE_PHOTO_FLOW_V2: false, // Force LYF paths to v1 only
  FEATURE_LYF_ENSEMBLE: false, // Pin LYF to frozen v1 only - no GPT/ensemble paths
  FEATURE_LYF_LOG_THIS_SET: true, // Enable one-tap logging
  FEATURE_NUMBER_WHEEL_PICKERS: true, // Enable roller number pickers with haptics
} as const;