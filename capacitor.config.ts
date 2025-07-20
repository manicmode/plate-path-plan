
import { CapacitorConfig } from '@capacitor/cli';

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isLovablePreview = typeof window !== 'undefined' && window.location.hostname.includes('lovableproject.com');

const config: CapacitorConfig = {
  appId: 'app.lovable.7654ebf086bc4d1d8243fa3eb5863908',
  appName: 'NutriCoach',
  webDir: 'dist',
  // Only use server URL for Lovable preview, not for native builds
  ...(isDevelopment && isLovablePreview && {
    server: {
      url: 'https://7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com?forceHideBadge=true',
      cleartext: true
    }
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#22c55e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  },
  ios: {
    contentInset: 'never',
    orientation: 'portrait',
    webViewConfiguration: {
      allowsInlineMediaPlaybook: true
    }
  },
  android: {
    orientation: 'portrait',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  }
};

export default config;
