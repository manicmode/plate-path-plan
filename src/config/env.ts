// Environment configuration for the client
export const DEBUG_CLIENT = import.meta.env.VITE_DEBUG_CLIENT === 'true';

// Other environment flags
export const DETECT_MODE = import.meta.env.VITE_DETECT_MODE;
export const FEATURE_USE_VISION_ONLY = import.meta.env.VITE_FEATURE_USE_VISION_ONLY === 'true';
export const DEBUG_BOOT = import.meta.env.VITE_DEBUG_BOOT === '1';
