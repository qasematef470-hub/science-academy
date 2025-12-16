import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBUq5Q1O5EX0hzAcHZOdbUO54leF0Ixnq0",
  authDomain: "luxor-math-quiz-2025.firebaseapp.com",
  projectId: "luxor-math-quiz-2025",
  storageBucket: "luxor-math-quiz-2025.firebasestorage.app",
  messagingSenderId: "941633004706",
  appId: "1:941633004706:web:6b17d984b4575681eca3fb"
};

const appName = "LuxorApp";
let app;

if (!getApps().some(app => app.name === appName)) {
  console.log("🔥 Initializing NEW Firebase Instance with Key:", firebaseConfig.apiKey);
  app = initializeApp(firebaseConfig, appName);
} else {
  console.log("♻️ Using Existing Firebase Instance");
  app = getApp(appName);
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// إعداد خدمة الإشعارات (للمتصفح فقط)
let messaging = null;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.log("Firebase Messaging not supported in this environment");
  }
}
export { messaging };