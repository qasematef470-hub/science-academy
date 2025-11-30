import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// قراءة البيانات من ملف .env.local
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // السطر ده مهم جداً عشان يعالج المسافات في المفتاح
  privateKey: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined,
};

// تعريف المتغيرات
let adminDb;
let adminAuth;

try {
  // التأكد من عدم تشغيل التطبيق مرتين
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  adminDb = getFirestore();
  adminAuth = getAuth();
  
  console.log("✅ Firebase Admin Initialized Successfully");

} catch (error) {
  console.error("❌ Firebase Admin Init Error:", error);
}

export { adminDb, adminAuth };