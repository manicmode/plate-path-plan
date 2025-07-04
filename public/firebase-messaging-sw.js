
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

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);
    
    try {
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'nutrition-coach',
        renotify: true,
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'Open App',
            icon: '/favicon.ico'
          }
        ]
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
}

self.addEventListener('notificationclick', (event) => {
  try {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
      event.waitUntil(
        clients.openWindow('/')
      );
    }
  } catch (error) {
    console.error('Notification click error:', error);
  }
});

// Add error handling for service worker errors
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});
