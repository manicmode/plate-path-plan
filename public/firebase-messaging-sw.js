
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCKQW3vYzxCyVA9gN6mddTKrYgDghBChe4",
  authDomain: "nutricoach-app-c2580.firebaseapp.com",
  projectId: "nutricoach-app-c2580",
  storageBucket: "nutricoach-app-c2580.firebasestorage.app",
  messagingSenderId: "22648299355",
  appId: "1:22648299355:web:db68d2e8755a6c9c47847e",
  measurementId: "G-SK13GBDK15"
};

let messaging = null;

// Safer Firebase initialization
try {
  // Check if Firebase is available
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('Firebase messaging initialized in service worker');

    messaging.onBackgroundMessage((payload) => {
      console.log('Background message received:', payload);
      
      if (!payload.notification) {
        console.log('No notification payload found');
        return;
      }

      try {
        const notificationTitle = payload.notification.title || 'NutriCoach';
        const notificationOptions = {
          body: payload.notification.body || '',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'nutrition-coach',
          renotify: true,
          data: payload.data || {},
          actions: [
            {
              action: 'open',
              title: 'Open App',
              icon: '/favicon.ico'
            }
          ]
        };

        // Only show notification if we're not in a mobile browser that might not support it well
        self.registration.showNotification(notificationTitle, notificationOptions);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    });
  } else {
    console.log('Firebase not available in service worker environment');
  }
} catch (error) {
  console.error('Firebase initialization error in service worker:', error);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  try {
    console.log('Notification clicked:', event);
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if app not open
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
      );
    }
  } catch (error) {
    console.error('Notification click error:', error);
  }
});

// Enhanced error handling for mobile browsers
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
  event.preventDefault(); // Prevent default browser behavior
});

// Add install and activate event listeners for better mobile support
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});
