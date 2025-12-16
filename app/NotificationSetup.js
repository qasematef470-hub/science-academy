'use client';
import { useEffect } from "react";
import { messaging, db, auth } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function NotificationSetup() {

  useEffect(() => {
    // التأكد إننا في المتصفح
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      
      // 1. تسجيل ملف الخدمة اللي حطيناه في public
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => console.log('✅ Service Worker Registered'))
        .catch((err) => console.error('❌ SW Registration failed:', err));

      const setupNotifications = async (user) => {
        try {
          // 2. طلب الإذن من الطالب
          const permission = await Notification.requestPermission();
          
          if (permission === "granted" && messaging) {
            
            // 👇👇 الصق المفتاح الطويل هنا مكان الجملة العربي 👇👇
            const vapidKey = "BHNbDj1D1C71avdT62txhDv9cVtSkgg4kK0Sj3myqNv4cxZXBXyZn9LN5fRKOwMvh9lqJIsHWOOffXbwkIyWZQA";

            // 3. استخراج التوكن
            const token = await getToken(messaging, { vapidKey });

            if (token && user) {
                console.log("🔔 FCM Token:", token);
                // 4. حفظ التوكن في حساب الطالب
                await updateDoc(doc(db, 'users', user.uid), {
                    fcmTokens: arrayUnion(token)
                });
            }
          } else {
            console.log("🔕 الطالب رفض الإشعارات");
          }
        } catch (error) {
          console.error("Error setting up notifications:", error);
        }
      };

      // مراقبة تسجيل الدخول
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          if (user) setupNotifications(user);
      });

      // الاستقبال والموقع مفتوح (صوت أو رسالة)
      if (messaging) {
        const unsubscribeMsg = onMessage(messaging, (payload) => {
          console.log("Foregound Message:", payload);
          const { title, body } = payload.notification;
          new Notification(title, { body, icon: '/logo.png' });
        });
        
        return () => {
            unsubscribeAuth();
            unsubscribeMsg();
        };
      }
    }
  }, []);

  return null;
}