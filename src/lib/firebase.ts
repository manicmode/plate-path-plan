
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
    // Check if we're in a secure context and have required APIs
    if (!window.isSecureContext) {
      throw new Error('Firebase requires a secure context (HTTPS)');
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    // Dynamically import Firebase modules
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, isSupported } = await import('firebase/messaging');
    
    // Check if messaging is supported before initializing
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      throw new Error('Firebase messaging not supported on this browser');
    }

    firebaseApp = initializeApp(firebaseConfig);
    messaging = getMessaging(firebaseApp);
    isInitialized = true;
    
    console.log('Firebase initialized successfully');
    return { app: firebaseApp, messaging };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
};

export const requestNotificationPermission = async () => {
  try {
    // Initialize Firebase first
    const { messaging } = await initializeFirebase();
    
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
    console.error('Error getting notification permission:', error);
    throw error;
  }
};

export const onMessageListener = async () => {
  try {
    const { messaging } = await initializeFirebase();
    const { onMessage } = await import('firebase/messaging');
    
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  } catch (error) {
    console.error('Error setting up message listener:', error);
    throw error;
  }
};
