
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
   apiKey: "AIzaSyCKQW3vYzxCyVA9gN6mddTKrYgDghBChe4",
  authDomain: "nutricoach-app-c2580.firebaseapp.com",
  projectId: "nutricoach-app-c2580",
  storageBucket: "nutricoach-app-c2580.firebasestorage.app",
  messagingSenderId: "22648299355",
  appId: "1:22648299355:web:db68d2e8755a6c9c47847e",
  measurementId: "G-SK13GBDK15"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BK8Wz_j-9XzGVhQ7mD3fL9qK2pR8nE4tA6vB7sC1dF0gH2iJ3kL4mN5oP6qR7sT8uV9wX0yZ1aB2cD3eF4gH5i'
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
