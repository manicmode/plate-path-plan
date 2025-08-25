
// Firebase configuration and utilities
let firebaseApp: any = null;
let messaging: any = null;
let isInitialized = false;

const firebaseConfig = {
  apiKey: "AIzaSyCKQW3vYzxCyVA9gN6mddTKrYgDghBChe4",
  authDomain: "nutricoach-app-c2580.firebaseapp.com",
  projectId: "nutricoach-app-c2580",
  storageBucket: "nutricoach-app-c2580.firebasestorage.app",
  messagingSenderId: "22648299355",
  appId: "1:22648299355:web:db68d2e8755a6c9c47847e",
  measurementId: "G-SK13GBDK15"
};

const initializeFirebase = async () => {
  if (isInitialized) return { app: firebaseApp, messaging };
  
  try {
    // Add comprehensive mobile-specific checks
    const mobileChecks = {
      isSecureContext: window.isSecureContext,
      hasServiceWorkers: 'serviceWorker' in navigator,
      hasNotifications: 'Notification' in window,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      isPrivateMode: (() => {
        try {
          localStorage.setItem('__test_private__', 'test');
          localStorage.removeItem('__test_private__');
          return false;
        } catch {
          return true;
        }
      })()
    };
    
    console.log('🔍 Firebase init mobile checks:', mobileChecks);
    
    // Check if we're in a secure context and have required APIs
    if (!window.isSecureContext) {
      console.warn('Firebase requires a secure context (HTTPS) - skipping initialization');
      return { app: null, messaging: null };
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported - skipping Firebase messaging');
      return { app: null, messaging: null };
    }
    
    // Special handling for iOS Safari private mode
    if (mobileChecks.isIOS && mobileChecks.isPrivateMode) {
      console.warn('iOS private mode detected - skipping Firebase messaging');
      return { app: null, messaging: null };
    }

    // Dynamically import Firebase modules with timeout
    const importTimeout = (name: string) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Firebase ${name} import timeout`)), 10000)
    );
    
    const firebaseAppModule = await Promise.race([
      import('firebase/app'),
      importTimeout('app')
    ]) as typeof import('firebase/app');
    
    const firebaseMessagingModule = await Promise.race([
      import('firebase/messaging'),
      importTimeout('messaging')
    ]) as typeof import('firebase/messaging');
    
    const { initializeApp } = firebaseAppModule;
    const { getMessaging, isSupported } = firebaseMessagingModule;
    
    // Check if messaging is supported before initializing
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      console.warn('Firebase messaging not supported on this browser - continuing without messaging');
      // Still initialize the app for other Firebase features
      firebaseApp = initializeApp(firebaseConfig);
      isInitialized = true;
      return { app: firebaseApp, messaging: null };
    }

    firebaseApp = initializeApp(firebaseConfig);
    messaging = getMessaging(firebaseApp);
    isInitialized = true;
    
    console.log('✅ Firebase initialized successfully');
    return { app: firebaseApp, messaging };
  } catch (error) {
    console.error('❌ Firebase initialization failed (non-blocking):', error);
    // Don't throw - make it non-blocking so app can still start
    return { app: null, messaging: null };
  }
};

export const requestNotificationPermission = async () => {
  try {
    // Initialize Firebase first (non-blocking)
    const { messaging } = await initializeFirebase();
    
    // If Firebase/messaging failed to init, gracefully fail
    if (!messaging) {
      console.warn('Firebase messaging not available - skipping notification permission');
      return null;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getToken } = await import('firebase/messaging');
      const token = await getToken(messaging, {
        vapidKey: 'BK8Wz_j-9XzGVhQ7mD3fL9qK2pR8nE4tA6vB7sC1dF0gH2iJ3kL4mN5oP6qR7sT8uV9wX0yZ1aB2cD3eF4gH5i'
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification permission (non-blocking):', error);
    // Don't throw - make it non-blocking
    return null;
  }
};

export const onMessageListener = async () => {
  try {
    const { messaging } = await initializeFirebase();
    
    // If Firebase/messaging failed to init, return a dummy promise
    if (!messaging) {
      console.warn('Firebase messaging not available - skipping message listener');
      return new Promise(() => {}); // Never resolves, but doesn't break
    }
    
    const { onMessage } = await import('firebase/messaging');
    
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  } catch (error) {
    console.error('Error setting up message listener (non-blocking):', error);
    // Return dummy promise instead of throwing
    return new Promise(() => {});
  }
};
