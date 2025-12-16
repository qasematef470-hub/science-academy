// يفضل استخدام نسخ أحدث شوية لضمان التوافق (9.22.0)
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBUq5Q1O5EX0hzAcHZOdbUO54leF0Ixnq0",
  authDomain: "luxor-math-quiz-2025.firebaseapp.com",
  projectId: "luxor-math-quiz-2025",
  storageBucket: "luxor-math-quiz-2025.firebasestorage.app",
  messagingSenderId: "941633004706",
  appId: "1:941633004706:web:6b17d984b4575681eca3fb"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 1. استقبال الرسائل والموقع مقفول
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/images/logo.png', // تأكد إن اللوجو موجود في public
    // 👇 التعديل 1: بنمرر الرابط هنا عشان نعرف نفتحه لما يدوس
    data: { 
        url: payload.data?.url || payload.data?.link || '/' 
    },
    requireInteraction: true // الإشعار يفضل ثابت
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 👇 التعديل 2 (مهم جداً): لما يدوس على الإشعار يفتح الموقع
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // اقفل الإشعار
  
  // هات الرابط اللي جاي مع الإشعار
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // لو فيه تاب مفتوح على نفس الموقع، ركز عليه
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // شرط بسيط: لو الرابط هو هو أو من نفس الدومين
        if (client.url.includes(self.location.origin) && 'focus' in client) {
            if (urlToOpen !== '/') client.navigate(urlToOpen); // روح للرابط الجديد
            return client.focus();
        }
      }
      // لو مفيش تاب مفتوح، افتح واحد جديد
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});