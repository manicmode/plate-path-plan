
import { CapacitorConfig } from '@capacitor/cli';

// Production-focused Capacitor configuration for iOS
const config: CapacitorConfig = {
  appId: 'fit.myvoyage.app',
  appName: 'MyVoyageAI',
  webDir: 'dist',
  server: {
    cleartext: false,
    allowNavigation: [
      'uzoiiijqtahohfafqirm.supabase.co',
      'api.openfoodfacts.org',
      'world.openfoodfacts.org',
      'www.googleapis.com',
      'www.gstatic.com'
    ]
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#ffffff'
  }
};

export default config;

