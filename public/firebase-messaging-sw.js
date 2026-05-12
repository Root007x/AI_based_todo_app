importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDm1zRK-nGwOdKNhRHIwprDUasFP3bococ",
  authDomain: "ai-based-todo-8110e.firebaseapp.com",
  projectId: "ai-based-todo-8110e",
  storageBucket: "ai-based-todo-8110e.firebasestorage.app",
  messagingSenderId: "202700466267",
  appId: "1:202700466267:web:f88099b6506a8d66ad777e"
};

// If using real keys, these should be dynamically injected or hardcoded here for the SW
try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch(e) {
  console.log("Firebase SW init failed (likely due to mock config)", e);
}
