
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7654ebf086bc4d1d8243fa3eb5863908',
  appName: 'NutriCoach',
  webDir: 'dist',
  server: {
    url: 'https://7654ebf0-86bc-4d1d-8243-fa3eb5863908.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#22c55e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
